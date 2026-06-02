import React, { useState } from 'react';
import './ClinicLocationMap.css';

const ClinicLocationMap = ({ clinicName, clinicAddress, doctorName }) => {
  const [mapError, setMapError] = useState(false);

  // Encode the address for Google Maps URL
  const encodedAddress = encodeURIComponent(clinicAddress || '');
  const encodedClinicName = encodeURIComponent(clinicName || '');

  // Google Maps embed URL (no API key needed for basic embed)
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  // Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

  // Google Maps search URL (fallback)
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodedClinicName}+${encodedAddress}`;

  const handleMapError = () => {
    setMapError(true);
  };

  const openInGoogleMaps = () => {
    window.open(searchUrl, '_blank');
  };

  const getDirections = () => {
    window.open(directionsUrl, '_blank');
  };

  return (
    <div className="clinic-location-map">
      <div className="clinic-info-header">
        <div className="location-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2C5F9F"/>
          </svg>
        </div>
        <div className="clinic-info-text">
          <h3>{clinicName || 'Clinic Location'}</h3>
          <p>{clinicAddress || 'Address not available'}</p>
        </div>
      </div>

      <div className="map-container">
        {!mapError ? (
          <iframe
            title="Clinic Location Map"
            width="100%"
            height="300"
            frameBorder="0"
            style={{ border: 0 }}
            src={mapEmbedUrl}
            allowFullScreen
            onError={handleMapError}
          />
        ) : (
          <div className="map-fallback">
            <div className="map-fallback-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2C5F9F"/>
              </svg>
            </div>
            <p>Map preview unavailable</p>
            <button className="btn-view-map" onClick={openInGoogleMaps}>
              View in Google Maps
            </button>
          </div>
        )}
      </div>

      <div className="map-actions">
        <button className="btn-directions" onClick={getDirections}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="currentColor"/>
          </svg>
          Get Directions
        </button>
        <button className="btn-open-maps" onClick={openInGoogleMaps}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
          </svg>
          Open in Maps
        </button>
      </div>

      <div className="clinic-visit-note">
        <div className="note-icon">ℹ️</div>
        <div className="note-text">
          <strong>Important:</strong> This is an in-person consultation. Please arrive 10 minutes early and bring any relevant medical documents.
        </div>
      </div>
    </div>
  );
};

export default ClinicLocationMap;
