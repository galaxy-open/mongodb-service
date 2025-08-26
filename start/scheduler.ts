import scheduler from 'adonisjs-scheduler/services/main'

scheduler
  .call(() => {
    console.log('Hello World!')
  })
  .everyFiveSeconds()
