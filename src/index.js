// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// const { ipcRenderer} = require('electron');
// const { dialog } = require('electron')
// const notifier = require('node-notifier');
const storage = require('electron-json-storage');
const uuidv4 = require('uuid/v4');
var path = require('path');

// const trayBtn = document.getElementById('put-in-tray')
// let trayOn = false


// trayBtn.addEventListener('click', function (event) {
//     console.log('clicked')
    
//   if (trayOn) {
//     trayOn = false
//     ipcRenderer.send('remove-tray')
//   } else {
//     trayOn = true
//     ipcRenderer.send('put-in-tray')
//   }
// })

// // Tray removed from context menu on icon
// ipcRenderer.on('tray-removed', function () {
//     ipcRenderer.send('remove-tray')
//   trayOn = false
// })

// const sendNotification = () => {
// //   notifier.notify({
// //     title: 'Water Time!!',
// //     message: 'Looks like its time to finish another glass of water',
// //     //icon: path.join(__dirname, 'app/images/slack_icon.png'), // Absolute path (doesn't work on balloons)
// //     sound: true, // Only Notification Center or Windows Toasters
// //     wait: true // Wait with callback, until user action is taken against notification
// //   }, function (err, response) {
// //     // Response is response from notification
// //   });
// }

// document.addEventListener('DOMContentLoaded', function () {
//   trayOn = true;
//   ipcRenderer.send('put-in-tray');
//   sendNotification();
// })


var debounce = (func, wait, immediate) => {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};




document.addEventListener('DOMContentLoaded', async function() {
  var calendarEl = document.getElementById('calendar');
  const addReminderDiv = document.getElementById('addReminder');
  const clearAllDiv = document.getElementById('clearAll');
  const from = document.getElementById('fromId');
  const to = document.getElementById('toId');
  const description = document.getElementById('descriptionId');

  var optimisedUpdateEvent = null;

  var calendar = null;
  var globalEvents = [];

  const renderEvents = () => {
    calendarEl.innerHTML = '';
    calendar = new FullCalendar.Calendar(calendarEl, {
      plugins: [ 'bootstrap', 'interaction', 'timeGrid' ],
      defaultView: 'timeGridDay',
      header: null,
      editable: true,
      nowIndicator: true,
      businessHours: true,
      businessHours: {
        startTime: '09:00',
        endTime: '18:00',
      },
      events: function(info, successCallback, failureCallback) {
        getEvents().then(events => {
          successCallback(events);
        }).catch(e => {
          failureCallback(e);
        });
        
      },
      eventClick: function( eventClickInfo ) { 
        showContextMenu(eventClickInfo)
      },
      eventPositioned: function(info) {
        optimisedUpdateEvent(info);
      },
      // eventDestroy: function(info) {

      // }
    });
  
    calendar.render();
  }

  const showContextMenu = ({event}) => {
      $('#deleteEventID').on('click', () => {
        removeEvent({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
        });
        $('#myModalEdit').modal('hide');
        $('#deleteEventID').off('click');
      });
      $('#DurationID').text(`${event.start && event.start.toTimeString()} - ${event.end && event.end.toTimeString()}`);
      $('#descriptionID').text(event.title);
      $('#myModalEdit').modal('show');
  }

  const addEvent = (event) => {
    let events = [];
    storage.get('events', function(error, data) {
      if (error) throw error;
      if(data[new Date().getFullYear + new Date().getMonth + new Date().getDate]) {
        events.push(...data[new Date().getFullYear + new Date().getMonth + new Date().getDate], event);
      }
      else {
        events.push(event);
      }
      saveEvents(events);
    });
  }


  const updateEvent = (info) => {
    let { event, isEnd, isMirror, view, el } = info;
    let events = [];
    storage.get('events', function(error, data) {
      if (error) throw error;
      if(data[new Date().getFullYear + new Date().getMonth + new Date().getDate]) {
        events.push(...data[new Date().getFullYear + new Date().getMonth + new Date().getDate]);
      }
      events = events.filter(e => e.id != event.id);
      saveEvents([...events, { id: event.id, start: event.start, end: event.end, title: event.title, allDay: event.allDay }], true);
    });
  }

  optimisedUpdateEvent = debounce(updateEvent, 500);
  
  const removeEvent = (event) => {
    let events = [];
    storage.get('events', function(error, data) {
      if (error) throw error;
      if(data[new Date().getFullYear + new Date().getMonth + new Date().getDate]) {
        events.push(...data[new Date().getFullYear + new Date().getMonth + new Date().getDate]);
        events = events.filter(e => e.id != event.id);
        saveEvents(events);
      }
    });
   
  }
  
  const saveEvents = (events, shouldNotRender = false) => {
    let temp = {};
    temp[new Date().getFullYear + new Date().getMonth + new Date().getDate] = [...events];
    storage.set('events', temp, () => {
      if(!shouldNotRender) {
        renderEvents();
        const notification = {
          title: 'BTC Alert',
          body: 'BTC just beat your target price!',
          icon: __dirname + '../assets/logo.icns'
      }
        
        const myNotification = new window.Notification(notification.title, notification)
      }
    });
  }
  
  const getEvents = async () => {
    return new Promise(function(resolve, reject) {
      let events = [];
      storage.get('events', function(error, data) {
        if (error) {
          reject(error);
        };
        if(data[new Date().getFullYear + new Date().getMonth + new Date().getDate]) {
          events.push(...data[new Date().getFullYear + new Date().getMonth + new Date().getDate]);
        }
        globalEvents = [...events];
        resolve(events);
      });
    });
  }

  const clearAll = () => {
    saveEvents([]);
  }

  addReminderDiv.addEventListener('click', function (event) {
   $(function () {
     const getDate = (date) => {
      let a = date.split(':');
      let b = date.split(' ')[1];
      let c = new Date();
      if(b == 'PM' && parseInt(a[0]) !== 12) {
        a[0] = parseInt(a[0]) + 12;
      }
      c.setHours(parseInt(a[0]),parseInt(a[1]),0);
      return c.toISOString();
     }
   
      const event = {
          title: description.value,
          start: getDate(from.value),
          end: getDate(to.value),
          id: uuidv4(),
        };
        addEvent(event);
   });
  });

  clearAllDiv.addEventListener('click', function (event) {
    clearAll();
   });

  renderEvents();
  
});
