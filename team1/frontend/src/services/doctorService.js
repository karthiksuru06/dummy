import API from '../api/axiosConfig';

// Doctor Service - Centralized API calls for Doctor Dashboard

const doctorService = {
  // Dashboard
  getDashboardData: async (doctorId) => {
    try {
      const response = await API.get(`/doctors/${doctorId}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Appointments
  getUpcomingAppointments: async (doctorId) => {
    try {
      const response = await API.get(`/appointments/upcoming/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      throw error;
    }
  },

  getAllAppointments: async (doctorId) => {
    try {
      const response = await API.get(`/appointments/doctor/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  },

  approveAppointment: async (appointmentId, meetingData) => {
    try {
      const response = await API.post(`/appointments/${appointmentId}/approve`, meetingData);
      return response.data;
    } catch (error) {
      console.error('Error approving appointment:', error);
      throw error;
    }
  },

  rejectAppointment: async (appointmentId, rejectionData) => {
    try {
      const response = await API.post(`/appointments/${appointmentId}/reject`, rejectionData);
      return response.data;
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      throw error;
    }
  },

  rescheduleAppointment: async (appointmentId, newData) => {
    try {
      const response = await API.put(`/appointments/${appointmentId}/reschedule`, newData);
      return response.data;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  },

  cancelAppointment: async (appointmentId, cancellationData) => {
    try {
      const response = await API.delete(`/appointments/${appointmentId}`, { data: cancellationData });
      return response.data;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  },

  getAppointmentsByStatus: async (doctorId, status) => {
    try {
      const response = await API.get(`/appointments/doctor/${doctorId}?status=${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments by status:', error);
      throw error;
    }
  },

  getPrescriptionByAppointment: async (appointmentId) => {
    try {
      const response = await API.get(`/prescriptions/appointment/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching prescription:', error);
      throw error;
    }
  },

  // Patients
  getPatients: async (doctorId, filter = 'all') => {
    try {
      const response = await API.get(`/patient/doctor/${doctorId}?filter=${filter}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  },

  getPatientDetails: async (patientId) => {
    try {
      const response = await API.get(`/patient/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient details:', error);
      throw error;
    }
  },

  // Prescriptions
  createPrescription: async (prescriptionData) => {
    try {
      const response = await API.post('/prescriptions', prescriptionData);
      return response.data;
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }
  },

  getPrescription: async (prescriptionId) => {
    try {
      const response = await API.get(`/prescriptions/${prescriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching prescription:', error);
      throw error;
    }
  },

  downloadPrescription: async (prescriptionId) => {
    try {
      const response = await API.get(`/prescriptions/${prescriptionId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading prescription:', error);
      throw error;
    }
  },

  // Notifications
  getNotifications: async (doctorId, params = {}) => {
    try {
      const response = await API.get(`/notifications/doctor/${doctorId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  getUnreadNotificationCount: async (doctorId) => {
    try {
      const response = await API.get(`/notifications/unread/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await API.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Pending Tasks
  getPendingTasks: async (doctorId) => {
    try {
      const response = await API.get(`/tasks/pending/doctor/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      throw error;
    }
  },

  // Get tasks for a doctor with optional filters (useful for filtered pending tasks)
  getTasksForDoctor: async (doctorId, params = {}) => {
    try {
      const response = await API.get(`/tasks/doctor/${doctorId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks for doctor:', error);
      throw error;
    }
  },

  updateTaskStatus: async (taskId, action) => {
    try {
      const response = await API.post(`/tasks/${taskId}/${action}`);
      return response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  },

  // Profile
  getDoctorProfile: async (doctorId) => {
    try {
      const response = await API.get(`/doctors/${doctorId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      throw error;
    }
  },

  updateDoctorProfile: async (doctorId, profileData) => {
    try {
      const response = await API.put(`/doctors/${doctorId}/profile`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  },

  updateAvailability: async (doctorId, availabilityData) => {
    try {
      const response = await API.put(`/doctors/${doctorId}/availability`, availabilityData);
      return response.data;
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  },

  uploadProfilePicture: async (doctorId, file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const response = await API.post(`/doctors/${doctorId}/profile-picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  // Settings
  getSettings: async (doctorId) => {
    try {
      const response = await API.get(`/doctor-settings/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  updateSettings: async (doctorId, settings) => {
    try {
      const response = await API.put(`/doctor-settings/${doctorId}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  changePassword: async (doctorId, passwordData) => {
    try {
      const response = await API.post(`/doctor-settings/${doctorId}/change-password`, passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Reports
  getPatientReports: async (patientId) => {
    try {
      const response = await API.get(`/reports/patient/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient reports:', error);
      throw error;
    }
  },

  viewReport: async (reportId) => {
    try {
      const response = await API.get(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error viewing report:', error);
      throw error;
    }
  },

  // Consultation Metrics
  getConsultationMetrics: async (doctorId) => {
    try {
      const response = await API.get(`/consultations/metrics/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching consultation metrics:', error);
      throw error;
    }
  }
};

export default doctorService;