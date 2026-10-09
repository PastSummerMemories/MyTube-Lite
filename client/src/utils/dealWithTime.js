

export const dealWithTime = (timeStr) => {



    const parts = timeStr.split(":").map(Number)
    const numberArr = [...parts]
    const length = numberArr.length
    let computedTime = 0

    for(let i = 0; i < length; i++) {
        computedTime += Math.pow(60,length - i -1) * numberArr[i]
    }

    console.log('computedTime:',computedTime)
    return computedTime

}

