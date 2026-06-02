import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaClock,
  FaExclamationTriangle,
  FaUserPlus,
  FaFileAlt,
  FaCalendarCheck,
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaFilter,
  FaSort,
  FaPrescription,
  FaPlus,
  FaTrash,
  FaSave
} from 'react-icons/fa';
import './DoctorPendingTasks.css';
import doctorService from '../../../services/doctorService';

const DoctorPendingTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientName: '',
    age: '',
    gender: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '', notes: '' }],
    tests: '',
    advice: ''
  });

  useEffect(() => {
    fetchPendingTasks();
  }, [filterType]);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData) {
        const doctorId = userData._id || userData.id;
        let response;

        if (filterType === 'all') {
          response = await doctorService.getPendingTasks(doctorId);
        } else if (filterType === 'urgent') {
          response = await doctorService.getTasksForDoctor(doctorId, { status: 'pending', priority: 'high' });
        } else {
          response = await doctorService.getTasksForDoctor(doctorId, { status: 'pending', task_type: filterType });
        }

        const tasksData = (response && response.tasks)
          ? response.tasks
          : (Array.isArray(response) ? response : []);

        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ff0000';
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffd93d';
      case 'low': return '#6bcf7f';
      default: return '#999';
    }
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'appointment_approval': return <FaCalendarCheck />;
      case 'report_review': return <FaFileAlt />;
      case 'patient_request': return <FaUserPlus />;
      case 'follow_up': return <FaClock />;
      case 'emergency_consultation': return <FaExclamationTriangle />;
      default: return <FaBell />;
    }
  };

  if (loading) {
    return (
      <div className="doctor-loading-container">
        <div className="doctor-loading-spinner"></div>
        <p>Loading pending tasks...</p>
      </div>
    );
  }

  return (
    <div className="doctor-pending-tasks">

      {/* Header */}
      <div className="doctor-tasks-header">
        <div className="doctor-header-content">
          <h1>Pending Tasks</h1>

          <div className="doctor-task-stats">
            <div className="doctor-stat-item doctor-urgent">
              <span className="doctor-stat-value">
                {tasks.filter(t => t.priority === 'urgent').length}
              </span>
              <span className="doctor-stat-label">Urgent</span>
            </div>

            <div className="doctor-stat-item doctor-high">
              <span className="doctor-stat-value">
                {tasks.filter(t => t.priority === 'high').length}
              </span>
              <span className="doctor-stat-label">High Priority</span>
            </div>

            <div className="doctor-stat-item doctor-total">
              <span className="doctor-stat-value">{tasks.length}</span>
              <span className="doctor-stat-label">Total Tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="doctor-tasks-controls">
        <div className="doctor-filter-section">
          <label><FaFilter /> Filter by:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="doctor-filter-select"
          >
            <option value="all">All Tasks</option>
            <option value="urgent">Urgent Only</option>
            <option value="appointment_approval">Appointment Approvals</option>
            <option value="prescription_renewal">Prescriptions</option>
            <option value="patient_request">Patient Requests</option>
          </select>
        </div>

        <div className="doctor-sort-section">
          <label><FaSort /> Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="doctor-sort-select"
          >
            <option value="priority">Priority</option>
            <option value="time">Time</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="doctor-tasks-grid">
        {tasks.length > 0 ? tasks.map(task => (
          <div
            key={task._id}
            className="doctor-task-card"
            style={{ borderLeftColor: getPriorityColor(task.priority) }}
          >
            <div className="doctor-task-header">
              <div className="doctor-task-icon">
                {getTaskIcon(task.task_type)}
              </div>

              <div className="doctor-task-info">
                <h3>{task.title}</h3>
                <p className="doctor-patient-name">
                  {task.patient_name || 'N/A'}
                </p>
              </div>

              <div className={`doctor-priority-badge doctor-${task.priority}`}>
                {task.priority}
              </div>
            </div>

            <div className="doctor-task-body">
              <p className="doctor-task-description">{task.description}</p>

              <div className="doctor-task-meta">
                <span className="doctor-time-elapsed">
                  <FaClock /> {formatTimeAgo(task.created_at)}
                </span>
              </div>
            </div>

            <div className="doctor-task-actions">
              <button className="doctor-action-btn doctor-view">
                <FaEye /> View
              </button>
            </div>
          </div>
        )) : (
          <div className="doctor-empty-tasks">
            <FaCheckCircle className="doctor-empty-icon" />
            <h3>All Caught Up!</h3>
            <p>No pending tasks at the moment.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default DoctorPendingTasks;