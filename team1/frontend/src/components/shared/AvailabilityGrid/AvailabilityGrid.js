import React from 'react';
import './AvailabilityGrid.css';

const AvailabilityGrid = ({ availability, onToggle, readOnly = false }) => {
  const timeSlots = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = React.useState(days[0]);

  // helper to format a slot like "9AM" -> "9-10 AM" (rollover for PM)
  const formatSlot = (slot) => {
    const match = slot.match(/(\d+)(AM|PM)/);
    if (!match) return slot;
    let hour = parseInt(match[1], 10);
    const period = match[2];
    let nextHour = hour + 1;
    let nextPeriod = period;
    if (hour === 11) {
      // switch from AM to PM or PM to AM (for 11PM -> 12AM)
      nextPeriod = period === 'AM' ? 'PM' : 'AM';
    }
    if (hour === 12) {
      nextHour = 1;
    }
    return `${hour}-${nextHour} ${period}`;
  };

  return (
    <div className="availability-grid-container">
      <div className="availability-grid-header">
        <h4>Set Your Weekly Availability</h4>
        <p className="availability-subtitle">Choose a day and then select the time slots when you are available.</p>
      </div>

      <div className="day-selector">
        <label htmlFor="day-select">Day:</label>
        <select
          id="day-select"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          disabled={readOnly}
        >
          {days.map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      </div>

      <div className="slots-container">
        {timeSlots.map((slot) => (
          <label key={slot} className="slot-item">
            <input
              type="checkbox"
              checked={availability[selectedDay]?.[slot] || false}
              onChange={() => !readOnly && onToggle(selectedDay, slot)}
              disabled={readOnly}
            />
            <span className="slot-label">{formatSlot(slot)}</span>
          </label>
        ))}
      </div>

      {/* list chosen slots below the checkboxes */}
      {(() => {
        const selectedSlots = timeSlots
          .filter(slot => availability[selectedDay]?.[slot])
          .map(formatSlot);
        return selectedSlots.length > 0 ? (
          <div className="selected-slots">
            <strong>Chosen slots:</strong> {selectedSlots.join(', ')}
          </div>
        ) : null;
      })()}

      {/* full summary for all days */}
      {(() => {
        const daysWithSlots = days.map(day => {
          const slots = timeSlots
            .filter(slot => availability[day]?.[slot])
            .map(formatSlot);
          return { day, slots };
        }).filter(entry => entry.slots.length > 0);

        if (daysWithSlots.length === 0) return null;

        return (
          <div className="full-summary">
            <strong>Availability overview:</strong>
            <ul>
              {daysWithSlots.map(({ day, slots }) => (
                <li key={day}>
                  <span className="summary-day">{day}:</span> {slots.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="availability-helper">
        <p>💡 Tip: Select all slots you are available for; you can change them later in your profile.</p>
      </div>
    </div>
  );
};

export default AvailabilityGrid;
