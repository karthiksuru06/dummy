import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiUsers, FiActivity } from 'react-icons/fi';
import API from '../../../api/axiosConfig';
import './AdminAnalytics.css';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    departmentStats: [],
    genderStats: [],
    ageGroups: {},
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await API.get('/admin/analytics');

      console.log('Analytics response:', response.data);
console.log('Monthly data:', response.data.analytics.monthlyData); // Debug log

      if (response.data.success) {
        console.log('Monthly data:', response.data.analytics.monthlyData); // Debug log
        console.log('Monthly data length:', response.data.analytics.monthlyData?.length);
        console.log('First month:', response.data.analytics.monthlyData?.[0]);
        setAnalytics(response.data.analytics);
      } else {
        console.log('API returned success: false');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', error.response?.data); // Debug log
    } finally {
      setLoading(false);
    }
  };

  // Get max value for chart scaling
 const maxCases = Math.max(
  ...((analytics.monthlyData || []).map(d => d.cases)),
  1
);
  return (
    <div className="admin-analytics">
      <div className="admin-page-header">
        <h1>Analytics Dashboard</h1>
        <p className="admin-page-subtitle">Comprehensive insights and statistics</p>
      </div>

      <div className="admin-analytics-grid">
        {/* Patient Statistics Chart */}
        <div className="admin-analytics-card large">
          <div className="admin-card-header">
            <h2><FiTrendingUp /> Patient Case Statistics (Monthly)</h2>
            <p className="admin-chart-subtitle">Completed cases over the last 12 months</p>
          </div>
          {loading ? (
            <div className="admin-chart-loading">
              <div className="admin-loader"></div>
              <p>Loading monthly data...</p>
            </div>
          ) : analytics.monthlyData?.length > 0 ? (
            <div className="admin-monthly-chart-container">
              <div className="admin-chart-y-axis">
                <span>{maxCases > 0 ? maxCases : 10}</span>
                <span>{maxCases > 0 ? Math.floor(maxCases / 2) : 5}</span>
                <span>0</span>
              </div>
              <div className="admin-monthly-chart-area">
                {analytics.monthlyData.map((data, index) => (
                  <div key={index} className="admin-monthly-bar-wrapper">
                    <div className="admin-monthly-bar-container">
                      {data.cases > 0 ? (
                        <div
                          className="admin-monthly-bar"
                          style={{ height: `${maxCases > 0 ? (data.cases / maxCases) * 100 : 0}%` }}
                        >
                          <span className="admin-bar-value">{data.cases}</span>
                        </div>
                      ) : (
                        <div className="admin-monthly-bar empty-bar">
                          <span className="admin-bar-value empty">0</span>
                        </div>
                      )}
                    </div>
                    <div className="admin-monthly-label">{data.month}</div>
                    <div className="admin-monthly-sublabel">{data.appointments} total</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="admin-no-data-state">
              <div className="admin-no-data-icon">📊</div>
              <h3>Unable to Load Data</h3>
              <p>There was an issue loading the monthly statistics.</p>
              <p className="admin-no-data-hint">Please refresh the page or contact support if the problem persists.</p>
            </div>
          )}
        </div>

        {/* Gender Demographics */}
        <div className="admin-analytics-card">
          <div className="admin-card-header">
            <h2><FiUsers /> Gender Demographics</h2>
          </div>
          {loading ? (
            <div className="admin-chart-loading small">
              <div className="admin-loader small"></div>
            </div>
          ) : analytics.genderStats && analytics.genderStats.length > 0 ? (
            <div className="admin-gender-stats">
              {(() => {
                const total = analytics.genderStats.reduce((sum, s) => sum + s.count, 0);
                let currentAngle = 0;
                const colors = {
                  'male': '#05294b',
                  'female': '#00b4d8',
                  'other': '#48cae4',
                  'not specified': '#90e0ef'
                };

                return (
                  <>
                    <div className="admin-pie-chart-container">
                      <svg className="admin-pie-chart" viewBox="0 0 200 200">
                        {analytics.genderStats.map((stat, index) => {
                          const percentage = total > 0 ? (stat.count / total) * 100 : 0;
                          const angle = (percentage / 100) * 360;

                          // Calculate path for pie slice
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;

                          const startRad = (startAngle - 90) * (Math.PI / 180);
                          const endRad = (endAngle - 90) * (Math.PI / 180);

                          const x1 = 100 + 90 * Math.cos(startRad);
                          const y1 = 100 + 90 * Math.sin(startRad);
                          const x2 = 100 + 90 * Math.cos(endRad);
                          const y2 = 100 + 90 * Math.sin(endRad);

                          const largeArcFlag = angle > 180 ? 1 : 0;

                          const pathData = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                          const gender = (stat.gender || 'not specified').toLowerCase();
                          const color = colors[gender] || colors['not specified'];

                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill={color}
                              className="pie-slice"
                              data-percentage={percentage.toFixed(1)}
                              onMouseEnter={(e) => {
                                setTooltip({
                                  visible: true,
                                  x: e.clientX,
                                  y: e.clientY,
                                  content: {
                                    gender: stat.gender || 'Not specified',
                                    count: stat.count,
                                    percentage: percentage.toFixed(1)
                                  }
                                });
                              }}
                              onMouseMove={(e) => {
                                setTooltip(prev => ({
                                  ...prev,
                                  x: e.clientX,
                                  y: e.clientY
                                }));
                              }}
                              onMouseLeave={() => {
                                setTooltip({ visible: false, x: 0, y: 0, content: 'null' });
                              }}
                            />
                          );
                        })}
                        <circle cx="100" cy="100" r="50" fill="white" />
                        <text x="100" y="95" textAnchor="middle" className="admin-pie-center-text">
                          {total}
                        </text>
                        <text x="100" y="110" textAnchor="middle" className="admin-pie-center-subtext">
                          Patients
                        </text>
                      </svg>
                    </div>
                    <div className="admin-pie-legend">
                      {analytics.genderStats.map((stat, index) => {
                        const percentage = total > 0 ? ((stat.count / total) * 100).toFixed(1) : 0;
                        const gender = (stat.gender || 'not specified').toLowerCase();
                        const color = colors[gender] || colors['not specified'];

                        return (
                          <div key={index} className="legend-item">
                            <span className="admin-legend-color" style={{backgroundColor: color}}></span>
                            <span className="admin-legend-label">{stat.gender || 'Not specified'}</span>
                            <span className="admin-legend-value">{percentage}% ({stat.count})</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="admin-no-data-state small">
              <div className="admin-no-data-icon small">👥</div>
              <p>No Gender Data</p>
              <span className="admin-no-data-hint-small">Register patients to see statistics</span>
            </div>
          )}
        </div>

        {/* Age Demographics */}
        <div className="admin-analytics-card">
          <div className="admin-card-header">
            <h2><FiActivity /> Age Demographics</h2>
          </div>
          {loading ? (
            <div className="admin-chart-loading small">
              <div className="admin-loader small"></div>
            </div>
          ) : analytics.ageGroups && Object.keys(analytics.ageGroups).length > 0 && Object.values(analytics.ageGroups).some(count => count > 0) ? (
            <div className="admin-age-stats">
              {Object.entries(analytics.ageGroups).map(([range, count], index) => {
                const maxCount = Math.max(...Object.values(analytics.ageGroups), 1);
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={index} className="admin-age-item">
                    <div className="admin-age-info">
                      <span className="admin-age-label">{range} years</span>
                      <span className="admin-age-count">{count}</span>
                    </div>
                    <div className="admin-age-bar-container">
                      <div className="admin-age-bar" style={{width: `${percentage}%`}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="admin-no-data-state small">
              <div className="admin-no-data-icon small">📊</div>
              <p>No Age Data</p>
              <span className="admin-no-data-hint-small">Patient age distribution will appear here</span>
            </div>
          )}
        </div>

        {/* Department Overview */}
        <div className="admin-analytics-card large">
          <div className="admin-acard-header">
            <h2>Department Overview</h2>
          </div>
          {loading ? (
            <div className="admin-chart-loading">
              <div className="admin-loader"></div>
              <p>Loading department data...</p>
            </div>
          ) : analytics.departmentStats && analytics.departmentStats.length > 0 ? (
            <div className="admin-dept-stats">
              {(() => {
                const maxDoctors = Math.max(...analytics.departmentStats.map(d => d.count), 1);
                return analytics.departmentStats.map((dept, index) => (
                  <div key={index} className="admin-dept-item">
                    <span className="admin-dept-name">{dept.specialization}</span>
                    <div className="admin-dept-bar" style={{width: `${(dept.count / maxDoctors) * 100}%`}}>
                      <span>{dept.count} doctor{dept.count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="admin-no-data-state">
              <div className="admin-no-data-icon">🏥</div>
              <h3>No Department Data</h3>
              <p>No approved doctors found.</p>
              <p className="admin-no-data-hint">Approve doctors to see department statistics.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="admin-chart-tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`
          }}
        >
          <div className="admin-tooltip-header">{tooltip.content.gender}</div>
          <div className="admin-tooltip-body">
            <div className="admin-tooltip-row">
              <span className="admin-tooltip-label">Patients:</span>
              <span className="admin-tooltip-value">{tooltip.content.count}</span>
            </div>
            <div className="admin-tooltip-row">
              <span className="admin-tooltip-label">Percentage:</span>
              <span className="admin-tooltip-value">{tooltip.content.percentage}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;