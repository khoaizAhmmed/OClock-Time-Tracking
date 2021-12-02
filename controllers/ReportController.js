/* eslint-disable no-undef */
const e = require('connect-flash');
const AttendanceModel = require('../models/AttendanceModel');
const UserModel = require('../models/UserModel')
const { timeToHour } = require('../utilities/formater');
// grobal variable  multiple date
const holidaysArray = [];
const leaveDaysArray = [];
global.holidayAndLeavedaysDateRange = []

// functin for total time count

function calculateTime(fixedTime, workingTotalSec){
  
  let getFixedSec = Number(fixedTime *  60 * 60 );
  let getTotalSec =  getFixedSec - workingTotalSec
  let hours = Math.floor(getTotalSec / 3600);
  getTotalSec %= 3600;
  let = minutes = Math.floor(getTotalSec / 60);
  let = seconds = getTotalSec % 60;
  
   return `${hours}:${minutes}:${seconds}`
    
  }
//  function for date formater
function dateFormate(dateTime) {
  const today = new Date(dateTime)
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const day = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate()
  const getDate = `${year}-${month}-${day}`;

  return getDate;
}
// sum fixedTime 
let sumFixedTime = null;
function totalFixedTime(day, fixedTime, type){
  
  
  let getHour = fixedTime[1]
  if(type === 'regular' && day !== 'Friday'){
    sumFixedTime += Number(getHour);
}else{
  sumFixedTime += 0;
}
 return sumFixedTime;
}

// holiday dates function
function multipleDate(numOfDay, date) {
  const myDate = new Date(date);
  const gotDate = new Date(myDate.setDate(myDate.getDate() - 1))

  for (let i = 1; i <= numOfDay; i += 1) {
    holidaysArray.push(dateFormate(gotDate.setDate(gotDate.getDate() + 1)))
  }
}
// leave dates funciton
function multipleLeaveDates(numOfDay, date) {
  const myDate = new Date(date);
  const gotDate = new Date(myDate.setDate(myDate.getDate() - 1))

  for (let i = 1; i <= numOfDay; i += 1) {
    leaveDaysArray.push(dateFormate(gotDate.setDate(gotDate.getDate() + 1)))
  }
}

const ReportController = {

  userReport: async (req, res) => {
    try {
      const [user] = await UserModel.findUserByEmail(req.user.userMailFormDB)
      console.log({user})

      const userId = user.id;
      const lastSevenDaysReport = await AttendanceModel.anEmployeeReportLastSavenDays(userId);
      const [{ avgStartTime }] = await AttendanceModel.avgStartTime(userId)
      const [{ avgEndTime }] = await AttendanceModel.avgEndTime(userId)
      const [{ weekTotal }] = await AttendanceModel.weekTotal(userId)
      const [{ monthTotal }] = await AttendanceModel.thisMonthTotal(userId)
      const weekHr = timeToHour(weekTotal)
      const monthHr = timeToHour(monthTotal)
      // for holidays
      const holidaysDate = await AttendanceModel.holidaysDate();
      // multiple date

      holidaysDate.forEach((el) => {
        multipleDate(el.count_holiday, el.holiday_start)
      })
      const lastSevenDaysReportDates = []
      const reportStringify = JSON.parse(JSON.stringify(lastSevenDaysReport));

      reportStringify.forEach((el) => {
        lastSevenDaysReportDates.push(el.date_for_holiday)
      })
      // check employee work in holiday
      const employeeWorkInHoliday = holidaysArray.filter((el) => lastSevenDaysReportDates.includes(el))
      // console.log({ employeeWorkInHoliday })
      const holidayObject = [];
      employeeWorkInHoliday.forEach((el) => {
        holidayObject.push({ h_date: el, type: 'holiday', fixed_time: '0' })
      })

      // =========for employee leave date
      const employeeLeaveDates = await AttendanceModel.employeeLeaveDates(userId)

      employeeLeaveDates.forEach((el) => {
        multipleLeaveDates(el.count_leave_day, el.leave_start)
      })

      const employeeWorkInLeaveDay = leaveDaysArray.filter((el) => lastSevenDaysReportDates.includes(el))
     // console.log({ employeeWorkInLeaveDay });

      const leaveDayObject = [];
      employeeWorkInLeaveDay.forEach((el) => {
        leaveDayObject.push({ l_date: el, type: 'leave', fixed_time: '0' })
      })
      // marge holiday and leave days array of object
      const margeHolidaysAndLeaveDays = [...holidayObject, ...leaveDayObject]
      // console.log({ margeHolidaysAndLeaveDays });
      // console.log({ leaveDayObject });

      holidayAndLeavedaysDateRange = margeHolidaysAndLeaveDays;

      // chek holiday and leave day then change type
      for (let i = 0; i < reportStringify.length; i += 1) {
        for (let j = 0; j < margeHolidaysAndLeaveDays.length; j += 1) {
          if (reportStringify[i].date_for_holiday === margeHolidaysAndLeaveDays[j].h_date) {
            reportStringify[i].type = margeHolidaysAndLeaveDays[j].type
            reportStringify[i].fixed_time = margeHolidaysAndLeaveDays[j].fixed_time

            break;
          } else if (reportStringify[i].date_for_holiday === margeHolidaysAndLeaveDays[j].l_date) {
            reportStringify[i].type = margeHolidaysAndLeaveDays[j].type
            reportStringify[i].fixed_time = margeHolidaysAndLeaveDays[j].fixed_time

            break;
          }
        }
      }

        // sum fixed time 
     // console.log({reportStringify});
      
        
     let sumSevendaysFixedTime; 
       reportStringify.forEach(el =>{
        sumSevendaysFixedTime = totalFixedTime(el.day, el.fixed_time, el.type)
        })
        console.log({sumSevendaysFixedTime});


      // last seven days total report pore employee
      const employeeLastSevendaysReportTotal = await AttendanceModel.reportLastSevendaysTotalForEmployee(userId)
      employeeLastSevendaysReportTotal.forEach((el) => {


        // console.log({holidayAndLeavedaysDateRange});
        
      // console.log('calculate time',calculateTime(el.fixed_total, el.total_seconds))

       el.totalLessORExtra =  calculateTime(el.fixed_total, el.total_seconds)
       el.fixed_total = sumSevendaysFixedTime
       ;
       //employeeLastSevendaysReportTotal.push({total_seconds:aa})
       
      })
    //  console.log({employeeLastSevendaysReportTotal});
    
      //  console.log(holidaysArray, leaveDaysArray);
      const fixedTime = await AttendanceModel.getFixedTime()
    //  console.log({ fixedTime });

      const userReport = [...reportStringify]
      sumFixedTime = 0;

      //console.log({ userReport });

      res.render('pages/report', {
        userReport, avgStartTime, avgEndTime, weekHr, monthHr, employeeLastSevendaysReportTotal,
      });
    } catch (err) {
      console.log('====>Error form ReportController/ userReport', err);
      return err;
    }
  },
  // return data AJAX for date range input
  reportBetweenTwoDate: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      const getData = await AttendanceModel.anEmployeeReportBetweenTwoDate(
        userId, startDate, endDate,
      );
      const getBetweenTowDateTotal = await AttendanceModel.reportBetweenTwoDateTotal(userId,startDate,endDate)
      const betweenTowDateTotalToJson = JSON.parse(JSON.stringify(getBetweenTowDateTotal))
      console.log({betweenTowDateTotalToJson});
      
      const dataToJson = JSON.parse(JSON.stringify(getData))
      // console.log({ dataToJson });
      // console.log({ holidayAndLeavedaysDateRange });

      for (let i = 0; i < dataToJson.length; i += 1) {
        // eslint-disable-next-line no-undef
        for (let j = 0; j < holidayAndLeavedaysDateRange.length; j += 1) {
          if (dataToJson[i].date_for_holiday === holidayAndLeavedaysDateRange[j].h_date) {
            dataToJson[i].type = holidayAndLeavedaysDateRange[j].type
            dataToJson[i].fixed_time = holidayAndLeavedaysDateRange[j].fixed_time

            break;
          } else if (dataToJson[i].date_for_holiday === holidayAndLeavedaysDateRange[j].l_date) {
            dataToJson[i].type = holidayAndLeavedaysDateRange[j].type
            dataToJson[i].fixed_time = holidayAndLeavedaysDateRange[j].fixed_time

            break;
          }
        }
      }
        // let dataRangeFixedTime ;
        // dataToJson.forEach(el =>{

        //   dataRangeFixedTime = totalFixedTime(el.day, el.fixed_time,el.type)
        // })
        // console.log({dataRangeFixedTime});



        const user =  {
          name: 'GR',
          age: 24
        }

      // console.log({  dataToJson, user });
    
   
        
       // return res.json(dataToJson)
       return res.json({reports:{dataToJson}, reportDateRangeTotal: {betweenTowDateTotalToJson}})


    } catch (err) {
      console.log('====>Error form ReportController/reportBetweenTwoDate', err);
      return err;
    }
  },



  // Admin see employees reports 
  reportEmployees: async(req,res) =>{

    try{
    const userId = req.params.id
    console.log({userId})
    const lastSevenDaysReport = await AttendanceModel.anEmployeeReportLastSavenDays(userId);
    console.log({lastSevenDaysReport});
    
      const userInfo = await AttendanceModel.getEmployeeInfo(userId)
      const [{ avgStartTime }] = await AttendanceModel.avgStartTime(userId)
      const [{ avgEndTime }] = await AttendanceModel.avgEndTime(userId)
      const [{ weekTotal }] = await AttendanceModel.weekTotal(userId)
      const [{ monthTotal }] = await AttendanceModel.thisMonthTotal(userId)
      const weekHr = timeToHour(weekTotal)
      const monthHr = timeToHour(monthTotal)
      res.render('pages/reportForEmployees', {userInfo,avgStartTime, avgEndTime, weekHr, monthHr})
    } catch(err){
    console.log('====>Error form', err);
    }
    
  }

}

module.exports = ReportController;
