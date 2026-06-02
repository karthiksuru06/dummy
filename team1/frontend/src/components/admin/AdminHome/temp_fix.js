        setMetrics({
          patients: response.data.metrics.patients || { total: 0, todayCases: 0 },
          doctors: response.data.metrics.doctors || { total: 0, scheduled: 0 },
          nurses: response.data.metrics.nurses || { total: 0, absentees: 0 },
          prescriptions: response.data.metrics.prescriptions || { total: 0, addedToday: 0 },
          pharmacist: response.data.metrics.pharmacist || { percentage: 0, approved: 0 },
          reports: response.data.metrics.reports || { total: 0, updated: 0 }
        });
