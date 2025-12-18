import moment from 'moment'

const date = new Date()
date.getTime() / 1000

export const timeFormat = timeStamp => {
  if (!timeStamp) return ' '

  if (/^\d+$/.test(timeStamp)) {
    const unixTime = parseInt(timeStamp)
    const momentDate = moment.unix(unixTime)
    
    if (!momentDate.isValid()) return ' '
    
    if (moment().diff(momentDate, 'days') === 0) {
      return momentDate.format('h:mm a')
    } else if (moment().diff(momentDate, 'days') < 7) {
      return momentDate.format('ddd')
    } else {
      return momentDate.format('D MMM')
    }
  }
  
  const momentDate = moment(timeStamp)
  if (!momentDate.isValid()) return ' '
  
  if (moment().diff(momentDate, 'days') === 0) {
    return momentDate.format('h:mm a')
  } else if (moment().diff(momentDate, 'days') < 7) {
    return momentDate.format('ddd')
  } else {
    return momentDate.format('D MMM')
  }
}

export const getUnixTimeStamp = () => {
  return moment().unix().toString()
}