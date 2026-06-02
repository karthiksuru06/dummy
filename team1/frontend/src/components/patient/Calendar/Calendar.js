import React, { useState, useEffect, useMemo } from 'react';
import './Calendar.css';

const Calendar = ({ appointments = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Use today's date as default selected if nothing else is clicked
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Pre-calculate appointment dates for performance
  const appointmentDatesMap = useMemo(() => {
    const map = new Set();
    appointments.forEach(apt => {
      const dateStr = apt.appointment_date || apt.date;
      if (dateStr) {
        const d = new Date(dateStr);
        map.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= daysCount; i++) arr.push(new Date(year, month, i));
    return arr;
  }, [currentMonth]);

  const isToday = (date) => {
    if (!date) return false;
    return date.getDate() === currentDate.getDate() &&
           date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const hasAppointment = (date) => {
    if (!date) return false;
    return appointmentDatesMap.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  };

  const handleMonthChange = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  return (
    <div className="calendar-modern">
      <div className="calendar-modern-header">
        <h3 className="month-display">
          {monthNames[currentMonth.getMonth()]} <span>{currentMonth.getFullYear()}</span>
        </h3>
        <div className="nav-controls">
          <button className="nav-btn" onClick={() => handleMonthChange(-1)}>‹</button>
          <button className="today-btn" onClick={() => {
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
          }}>Today</button>
          <button className="nav-btn" onClick={() => handleMonthChange(1)}>›</button>
        </div>
      </div>

      <div className="calendar-modern-grid">
        {daysInWeek.map(day => (
          <div key={day} className="weekday-label">{day}</div>
        ))}
        
        {days.map((date, index) => (
          <div 
            key={index}
            className={`date-cell ${!date ? 'empty' : ''} ${isToday(date) ? 'is-today' : ''} ${isSelected(date) ? 'is-selected' : ''} ${hasAppointment(date) ? 'has-apt' : ''}`}
            onClick={() => date && setSelectedDate(date)}
          >
            {date && (
              <>
                <span className="date-number">{date.getDate()}</span>
                {hasAppointment(date) && <div className="apt-dot" />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;