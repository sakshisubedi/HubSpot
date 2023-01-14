const axios = require("axios");
const constants = require("./constant.json");

/**
 * Entry point of the functionality
 * Firstly, it fetches partner list, parse these data and identify the start date for each country where most partners can make it for both days in a row.
 */
async function hostEvent() {
    try {
        const partnersList = await getPartnerList();
        // console.log("partnersList", partnersList);
        const attendeeObj = getAttendees(partnersList);
        const eventDates = getEventDateForEachCountry(attendeeObj);
        let sendInvitationRequestBody = Object.keys(eventDates).map(country => {
            const startDate = eventDates[country];
            return {
                "attendeeCount": attendeeObj[country][startDate].length,
                "attendees": attendeeObj[country][startDate],
                "name": country,
                "startDate": startDate
              }
        });
        sendInvitationRequestBody = {
            "countries": sendInvitationRequestBody
        }
        await sendInvitationToPartners(sendInvitationRequestBody);
    } catch (error) {
        console.log(error.message);
    }
}

/**
 * Get Partners Info
 * @returns partners list
 */
async function getPartnerList() {
    const partnersList = (await axios.get(`${constants.partnerListURL}?userKey=${constants.userKey}`)).data;
    if(!partnersList || !partnersList["partners"]) {
        throw new Error("No partners exists");
    }
    return partnersList.partners;
}

/**
 * Returns true if both dates are consecutive otherwise returns false
 * @param {String} date1 start date
 * @param {String} date2 next date
 * @returns true if date1 and date2 are consecutive date otherwise return false
 */
function isConsecutiveDate(date1, date2) {
    return Date.parse(new Date(date2)) - Date.parse(new Date(date1)) === 86400000;
}

/**
 * Get Attendee emails for all available dates for each country
 * @param {Object} partnerList 
 * @returns attendee object for all available dates for each country
 */
function getAttendees(partnerList) {
    let attendeeObj = {};
    partnerList.forEach(partnerObj => {
        if(!(partnerObj.country in attendeeObj)) {
            attendeeObj[partnerObj.country] = {}
        }
        partnerObj.availableDates.forEach(date => {
            if(!(date in attendeeObj[partnerObj.country])) {
                attendeeObj[partnerObj.country][date] = [];
            }
            attendeeObj[partnerObj.country][date].push(partnerObj.email);
        })
    }); 
    return attendeeObj;
}

/**
 * Gets event start date for each country
 * @param {*} attendeeObj 
 * @returns object containing mapping of each country and its event start date
 */
function getEventDateForEachCountry(attendeeObj) {
    const countryToStartDatesMapping = {};
    Object.keys(attendeeObj).forEach(country => {
        const dates = Object.keys(attendeeObj[country]);
        // sort date in ascending order
        dates.sort(function(a, b) {
            return new Date(a) - new Date(b);
        });

        let startDate = "", numOfAttendees = 0;
        for(let i=0; i<dates.length-1; i++) {
            if(isConsecutiveDate(dates[i], dates[i+1])) {
                if(startDate == "" || numOfAttendees < attendeeObj[country][dates[i]].length + attendeeObj[country][dates[i+1]].length) {
                    startDate = dates[i];
                    numOfAttendees = attendeeObj[country][dates[i]].length + attendeeObj[country][dates[i+1]].length;
                }
            }
        }
        countryToStartDatesMapping[country] = startDate;
    });
    return countryToStartDatesMapping;
}

/**
 * Sends Invitation To Partners for each country
 * @param {*} requestBody request body for send invitation request
 */
async function sendInvitationToPartners(requestBody) {
    const response = await axios.post(`${constants.sendInvitationURL}?userKey=${constants.userKey}`, {
        ...requestBody
    });
    console.log("sendInvitationToPartners response", response.data);
}


hostEvent();