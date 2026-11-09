---
title: "동기화 중 서버 중단으로 발생하는 이슈"
seoTitle: "Spring Batch 강제 종료 후 STARTED 상태로 남은 Job 자동 재시작: abandon·restart와 StepExecution"
description: "Spring Batch로 옮긴 가맹점 동기화를 실행 중에 kill -9로 죽여 보니, 실행 기록이 STARTED로 남아 다시 뜬 서버가 새 동기화를 영영 시작하지 못했습니다. 서버가 뜰 때 멈춘 실행을 실패로 표시하고 재시작하게 만들면서 찾은 버그 세 가지와, 끝난 파티션을 건너뛰게 한 과정을 정리했습니다."
pubDate: 2026-11-09
workPeriod: "2026.08"
categories: [troubleshooting, backend]
tags: [강원환급패스, Spring Batch, 장애 복구, 재시작]
series: gwpass-sync
seriesOrder: 5
thumbnail: ../../assets/posts/gwpass-sync-restart/thumbnail.svg
draft: false
---

[4편](../gwpass-sync-spring-batch/)에서 가맹점 동기화를 Spring Batch로 옮겨, 파티션마다 진행 상태를 DB에 남기게 했습니다. 이제 서버가 죽어도 어디까지 했는지는 남습니다. 그런데 정말 이어서 끝나는지는 죽여 봐야 알 수 있습니다. 이번 글은 동기화 도중 서버를 `kill -9`로 강제 종료하고 다시 띄우기를 반복하며 찾은 문제들입니다.

## 왜 kill -9인가

서버를 정상적으로 끄면(`SIGTERM`) Spring이 종료 절차를 밟을 기회가 있습니다. 하지만 메모리 부족으로 프로세스가 죽거나 장비가 멈추면 그럴 기회가 없습니다. 이런 상황을 흉내 내려고 종료 절차 없이 바로 죽이는 `kill -9`를 썼습니다. 처음엔 로컬에서, 다음엔 실제 RDS 테스트 DB에 붙은 서버에서 동기화 도중 여러 번 죽이고 다시 띄웠습니다.

## 문제: 다시 뜬 서버가 동기화를 영영 시작하지 못한다

첫 번째로 죽였을 때(파티션 243개 중 121개 완료 시점) 서버를 다시 띄우고 동기화를 실행하자, **실행 요청이 거부됐습니다.** 몇 번을 다시 요청해도 마찬가지였습니다.

원인은 Spring Batch 실행 기록에 남은 상태였습니다. Spring Batch는 Job을 시작하면 실행 기록(`BATCH_JOB_EXECUTION`)의 상태를 `STARTED`로 바꾸고, 끝날 때 `COMPLETED`나 `FAILED`로 바꿉니다. `kill -9`로 죽으면 끝날 때 할 일을 못 하니 **상태가 `STARTED`로 영원히 남습니다.**

그리고 동기화 실행 코드는 동기화가 두 번 동시에 돌지 않도록, 실행 중인 Job이 있으면 새 실행을 거부하고 있었습니다.

```java
if (!jobExplorer.findRunningJobExecutions("merchantSyncJob").isEmpty()) {
    return Optional.empty();   // 이미 실행 중 → 새로 시작하지 않음
}
```

죽은 프로세스가 남긴 `STARTED` 기록이 **"지금 실행 중인 동기화"로 보이니**, 이 검사에 영원히 걸렸습니다. 진행 상태를 DB에 남기게 했더니, 오히려 그 기록 때문에 다시 시작을 못 하게 된 것입니다.

![① 동기화가 도는 동안 BATCH_JOB_EXECUTION의 merchantSyncJob과 BATCH_STEP_EXECUTION의 merchantPageSyncStep, 워커 Step 여러 개가 STARTED로 기록된다. ② kill -9로 프로세스가 즉시 종료되면 끝날 때 할 일을 못 해서, 프로세스는 없는데 기록은 STARTED 그대로 남는다. ③ 서버를 다시 띄우고 동기화를 요청하면 findRunningJobExecutions가 이 STARTED 기록을 실행 중으로 보고 요청을 거부한다. 몇 번을 해도 같다. Spring Batch는 이 기록이 정말 돌고 있는 것인지 죽은 프로세스가 남긴 것인지 구분하지 못한다](../../assets/posts/gwpass-sync-restart/stuck.png)

*죽은 프로세스가 남긴 STARTED 기록이 새 실행을 막는다*

## 해결: 서버가 뜰 때 멈춘 실행을 이어서 돌린다

서버가 뜰 때 한 번 확인하게 했습니다. 앱이 다 뜬 시점(`ApplicationReadyEvent`)에 동기화 Job의 가장 최근 실행을 찾고, 그 상태가 실행 중(`STARTING`·`STARTED`·`STOPPING`)이면 **실패로 표시한 뒤 재시작**합니다.

"방금 뜬 서버가 보기에 실행 중으로 남은 기록은 죽은 프로세스가 남긴 것"이라고 판단할 수 있는 건 **서버가 한 대**이기 때문입니다. 서버가 한 대면 지금 막 뜬 이 서버 말고는 동기화를 돌릴 프로세스가 없습니다.

![전제는 서버가 한 대라서 기동할 때 실행 중으로 남은 기록은 죽은 프로세스의 것이라는 점이다. ApplicationReadyEvent에서 한 번 확인한다. 가장 최근 JobExecution이 STARTING, STARTED, STOPPING 같은 실행 중 상태면, 실행 중인 StepExecution을 jobRepository.update로 FAILED로 바꾸고(버그 2: 재시작할 때 Step 기록이 하나라도 실행 중이면 거부), JobExecution도 jobRepository.update로 FAILED로 바꾼 뒤(버그 1: abandon()은 실행 중인 기록을 받지 않음), jobOperator.restart()로 같은 JobInstance에 JobExecution 2를 만든다(버그 3: 재시작한 실행엔 끝난 Step 기록이 없어 집계는 JobInstance의 모든 실행에서 찾아야 함)](../../assets/posts/gwpass-sync-restart/recover.png)

*서버가 뜰 때 멈춘 실행을 복구하는 순서와, 각 단계에서 만난 버그*

이 과정을 만들며 버그 세 가지를 차례로 만났습니다.

| 차수 | 죽인 시점 | 증상 | 원인과 수정 |
|---|---|---|---|
| 1차 | 121/243 파티션 | 새 동기화 실행이 영원히 거부됨 | 위의 `STARTED` 문제. `JobOperator.abandon()`은 실행 중 상태를 받아 주지 않음 → `JobRepository`로 직접 `FAILED` 표시 |
| 2차 | 20/243 파티션 | 재시작할 때 예외 | Job 실행 기록만 `FAILED`로 바꿨는데, 그 안의 Step 실행 기록이 여전히 `STARTED` → Step 기록도 전부 `FAILED` 표시 |
| 3차 | 20/243 파티션 | 남은 223개 정상 처리 | — |
| 재개 뒤 | — | 이미 끝난 단계를 실패로 집계 | 결과를 지금 실행에서만 찾음 → 같은 JobInstance의 모든 실행에서 찾도록 수정 |

### 버그 1: abandon()은 실행 중인 기록을 받지 않는다

Spring Batch에는 남은 실행을 "버림" 처리하는 `JobOperator.abandon()`이 있습니다. 하지만 `abandon()`은 **이미 멈춘(`STOPPED`) 실행**을 정리하는 용도라, `STARTED`인 실행은 "아직 실행 중"이라며 받아 주지 않습니다. Spring Batch 입장에서는 이 실행이 정말 돌고 있는지, 죽은 프로세스가 남긴 것인지 구분할 방법이 없기 때문입니다.

그래서 우리가 판단을 대신했습니다. 위에서 말한 "서버가 한 대"라는 근거로, `JobRepository.update()`로 실행 기록을 직접 `FAILED`로 바꾼 뒤 `JobOperator.restart()`로 재시작했습니다. Spring Batch는 `FAILED`나 `STOPPED`인 실행만 재시작할 수 있습니다.

### 버그 2: Step 실행 기록도 하나하나 검사한다

Job 실행 기록만 `FAILED`로 바꾸고 다시 죽여 보니(2차), 이번에는 재시작하는 순간 예외가 났습니다. Spring Batch의 Job 실행 코드(`TaskExecutorJobLauncher`)를 열어 보니, 재시작할 때 **이전 실행에 속한 Step 실행 기록을 하나하나 보고, 하나라도 실행 중 상태면** 이미 실행 중이라며 거부하고 있었습니다.

`kill -9` 시점에는 가맹점 Step과 그 안의 워커 Step 여러 개가 `STARTED`로 남아 있습니다. 그래서 Job 기록과 함께 **실행 중 상태로 남은 Step 기록도 전부 `FAILED`로** 바꾸도록 고쳤습니다.

```java
// 단일 인스턴스이므로 기동 시 남아 있는 실행은 이전 프로세스가 죽어 남긴 것이다
for (StepExecution step : execution.getStepExecutions()) {
    if (step.getStatus().isRunning()) {
        step.setStatus(BatchStatus.FAILED);
        jobRepository.update(step);
    }
}
execution.setStatus(BatchStatus.FAILED);
jobRepository.update(execution);
jobOperator.restart(execution.getId());
```

3차로 다시 죽이고 띄우자, 서버가 뜨면서 멈춘 실행을 스스로 찾아 재시작했고 남은 파티션 223개를 처리해 끝까지 완료했습니다.

### 버그 3: 건너뛴 단계를 실패로 집계했다

재개된 동기화는 끝까지 돌았는데, 결과를 기록하는 `sync_runs`에는 관광지 단계가 **실패**로 남았습니다.

재시작하면 Spring Batch는 이전 실행에서 이미 `COMPLETED`된 Step을 다시 돌리지 않습니다. 관광지 동기화 Step은 첫 실행에서 끝났으니, 재시작한 실행에는 **그 Step의 기록이 아예 없습니다.** 그런데 결과를 집계하는 리스너는 **지금 실행의 Step 기록에서만** 결과를 찾았고, 못 찾으면 실패로 처리했습니다.

![같은 JobInstance에 실행이 두 개 있다. JobExecution 1(첫 실행, FAILED)의 BATCH_STEP_EXECUTION에는 tourSyncStep COMPLETED, merchantPageSyncStep FAILED, 워커 Step 일부 COMPLETED가 있고 courseGenerationStep은 기록이 없다. JobExecution 2(재시작, COMPLETED)에는 tourSyncStep 기록이 없고(건너뜀) merchantPageSyncStep, courseGenerationStep, cacheEvictStep이 COMPLETED다. 결과 집계 리스너가 JobExecution 2에서만 찾으면 tourSyncStep 기록이 없어 관광지 단계를 실패로 집계하고, JobInstance의 모든 실행에서 찾으면 JobExecution 1의 COMPLETED 기록을 찾아 성공으로 집계한다](../../assets/posts/gwpass-sync-restart/aggregate.png)

*재시작한 실행에는 이미 끝난 Step의 기록이 없다*

관광지·가맹점·코스 단계 모두 **같은 JobInstance에 속한 모든 실행**에서 Step 기록을 찾도록 바꿨습니다.

## 끝난 파티션은 건너뛴다

재시작했을 때 이미 끝난 페이지를 다시 받으면 Spring Batch로 옮긴 의미가 반쯤 사라집니다. 그래서 Partitioner가 파티션을 만들 때 **같은 JobInstance의 이전 실행에서 `COMPLETED`된 워커 Step**을 찾아, 그 (지역, 페이지)는 빼고 만들게 했습니다.

![JobExecution 1의 워커 StepExecution 중 region-51110-page1, page2처럼 COMPLETED인 것만 골라 "지역코드:페이지"로 모은다. Partitioner는 (지역, 페이지)를 만들 때 이 집합에 있으면 파티션에서 뺀다. 그래서 JobExecution 2에서는 FAILED였던 region-51130-page5와 기록이 없던 page6처럼 끝나지 않은 것만 워커 Step으로 실행하고, 이미 받은 페이지는 외부 API를 다시 부르지 않는다](../../assets/posts/gwpass-sync-restart/skip.png)

*재시작할 때 끝난 파티션은 만들지 않는다*

```java
Set<String> completed = jobExplorer.getJobExecutions(currentExecution.getJobInstance()).stream()
    .filter(execution -> !execution.getId().equals(currentExecution.getId()))
    .flatMap(execution -> execution.getStepExecutions().stream())
    .filter(worker -> worker.getStepName().startsWith("merchantPageWorkerStep"))
    .filter(worker -> worker.getStatus() == BatchStatus.COMPLETED)
    .map(worker -> partitionKey(worker.getExecutionContext()))   // "지역코드:페이지"
    .collect(Collectors.toSet());
```

1차에서는 121개, 2·3차에서는 20개가 정확히 건너뛰어지는 것을 로그로 확인했습니다.

## 바뀐 점

실제 RDS 테스트 DB에 붙은 서버를 동기화 도중 여러 번 강제 종료하고 다시 띄워 봤습니다. 매번 서버가 뜨면서 멈춘 실행을 찾아 재시작했고, 끝난 파티션은 건너뛰고 남은 것만 처리해 끝까지 완료했습니다. `sync_runs`에도 관광지·가맹점·코스·전체 파이프라인이 모두 성공으로 기록됐습니다.

| | 바꾸기 전 | 바꾼 후 |
|---|---|---|
| 강제 종료 뒤 실행 기록 | `STARTED`로 영원히 남음 | 서버가 뜰 때 `FAILED`로 바꾸고 재시작 |
| 새 동기화 실행 | 영원히 거부 | 정상 실행 |
| 재시작 범위 | — | 끝난 Step·파티션은 건너뛰고 남은 것만 |
| 결과 집계 | 건너뛴 단계를 실패로 기록 | 이전 실행까지 찾아 성공으로 기록 |

## 남은 것

**서버가 한 대라는 전제 위에 있습니다.** "기동할 때 실행 중으로 남은 기록은 죽은 프로세스의 것"이라는 판단은 서버가 한 대일 때만 맞습니다. 서버가 여러 대면 다른 서버에서 정말 돌고 있는 동기화를 실패로 바꿔 버릴 수 있습니다. 그때는 누가 동기화를 돌리고 있는지 분산 락이나 하트비트로 확인하는 장치가 필요합니다.

**서버가 다시 떠야 복구됩니다.** 프로세스는 살아 있는데 동기화만 멈춘 경우(스레드가 외부 API 응답을 끝없이 기다리는 등)는 이 방법으로 잡히지 않습니다.

## 정리

- 진행 상태를 남기는 것과 **그 상태로 다시 시작할 수 있는 것은 다릅니다.** 강제로 죽였다 띄워 보기 전까지는 `STARTED` 기록이 새 실행을 막는다는 것을 몰랐습니다.
- Spring Batch는 남은 실행이 정말 돌고 있는지 알 수 없어서 **실행 중인 기록을 함부로 정리하지 않습니다.** "서버가 한 대"라는 우리 쪽 근거로 판단을 대신하고, Job과 Step 기록을 모두 `FAILED`로 바꿔 재시작했습니다.
- 재시작한 실행에는 **이미 끝난 Step의 기록이 없습니다.** 결과를 볼 때는 같은 JobInstance의 모든 실행을 봐야 합니다.

이 연재는 여기까지입니다. 순차로 돌다 끝까지 가지도 못하던 동기화가, 약 10분 만에 끝나고 중간에 죽어도 남은 부분부터 이어서 끝나게 됐습니다.
