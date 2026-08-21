// componentes/pacientes/CameraModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiX, FiRefreshCw, FiCheck } from 'react-icons/fi';

export const CameraModal = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ─── FUNCIÓN PARA DETENER LA CÁMARA ───
  const stopCamera = () => {
    console.log('🛑 Deteniendo cámara...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    
    navigator.mediaDevices?.getUserMedia?.({ video: true })
      .then(s => {
        s.getTracks().forEach(t => {
          t.stop();
          t.enabled = false;
        });
      })
      .catch(() => {});
    
    console.log('✅ Cámara detenida');
  };

  // ─── INICIAR CÁMARA ───
  const startCamera = async () => {
    try {
      setLoading(true);
      setError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('📷 Cámara iniciada');
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permiso denegado. Por favor, permite el acceso a la cámara.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setError('Error al iniciar la cámara: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── USE EFFECT ───
  useEffect(() => {
    startCamera();
    return () => {
      console.log('🧹 Cleanup: deteniendo cámara');
      stopCamera();
    };
  }, []);

  // ─── CAPTURAR FOTO ───
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
    }
  };

  // ─── REINTENTAR ───
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // ─── ACEPTAR FOTO ───
  const acceptPhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'foto_webcam.jpg', { type: 'image/jpeg' });
          onCapture(file, capturedImage);
          handleClose();
        });
    }
  };

  // ─── CERRAR Y DETENER CÁMARA ───
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // ─── Cerrar con ESC ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="odonto-modal-overlay" onClick={handleClose}>
      <div className="odonto-modal odonto-camera-modal" onClick={e => e.stopPropagation()}>
        <div className="odonto-modal-header primary">
          <div>
            <h3>
              <FiCamera size={18} />
              Tomar foto
            </h3>
          </div>
          <button className="odonto-modal-close" onClick={handleClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="odonto-modal-body odonto-camera-body">
          {error ? (
            <div className="odonto-camera-error">
              <p>{error}</p>
              <button className="odonto-btn-secondary" onClick={startCamera}>
                <FiRefreshCw size={16} /> Reintentar
              </button>
            </div>
          ) : loading ? (
            <div className="odonto-camera-loading">
              <div className="odonto-camera-spinner"></div>
              <p>Iniciando cámara...</p>
            </div>
          ) : (
            <div className="odonto-camera-viewport">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    className="odonto-camera-video"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
              ) : (
                <img src={capturedImage} alt="Captura" className="odonto-camera-captured" />
              )}
            </div>
          )}
        </div>

        <div className="odonto-modal-footer odonto-camera-footer">
          {!error && !loading && (
            <>
              {!capturedImage ? (
                <button className="odonto-camera-capture" onClick={capturePhoto}>
                  <FiCamera size={20} />
                </button>
              ) : (
                <>
                  <button className="odonto-btn-secondary" onClick={retakePhoto}>
                    <FiRefreshCw size={16} /> Reintentar
                  </button>
                  <button className="odonto-btn-primary" onClick={acceptPhoto}>
                    <FiCheck size={16} /> Aceptar
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};