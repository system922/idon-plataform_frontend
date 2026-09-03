// componentes/pacientes/CameraModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiX, FiRefreshCw, FiCheck } from 'react-icons/fi';
import Modal from '../../General/Modal';
import { IconTextButton, ButtonGroup } from '../../General/Button';

export const CameraModal = ({ isOpen, onCapture, onClose }) => {
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
    if (isOpen) {
      startCamera();
    }
    return () => {
      console.log('🧹 Cleanup: deteniendo cámara');
      stopCamera();
    };
  }, [isOpen]);

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
    setCapturedImage(null);
    onClose();
  };

  // ─── Cerrar con ESC ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // ─── FOOTER DEL MODAL ───
  const modalFooter = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={handleClose}
      >
        Cancelar
      </IconTextButton>
      {!error && !loading && (
        <>
          {!capturedImage ? (
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiCamera size={14} />}
              onClick={capturePhoto}
            >
              Capturar
            </IconTextButton>
          ) : (
            <>
              <IconTextButton
                variant="info"
                size="md"
                icon={<FiRefreshCw size={14} />}
                onClick={retakePhoto}
              >
                Reintentar
              </IconTextButton>
              <IconTextButton
                variant="success"
                size="md"
                icon={<FiCheck size={14} />}
                onClick={acceptPhoto}
              >
                Aceptar
              </IconTextButton>
            </>
          )}
        </>
      )}
    </ButtonGroup>
  );

  // ─── BODY DEL MODAL ───
  const modalBody = (
    <div className="odonto-camera-body" style={{ 
      minHeight: '300px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      {error ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <IconTextButton
            variant="secondary"
            size="md"
            icon={<FiRefreshCw size={14} />}
            onClick={startCamera}
          >
            Reintentar
          </IconTextButton>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e2e8f0', 
            borderTop: '3px solid #3b82f6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: '#64748b' }}>Iniciando cámara...</p>
        </div>
      ) : (
        <div style={{ width: '100%', position: 'relative' }}>
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  background: '#1a1a2e',
                  display: 'block'
                }}
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          ) : (
            <img 
              src={capturedImage} 
              alt="Captura" 
              style={{
                width: '100%',
                maxHeight: '400px',
                borderRadius: '8px',
                objectFit: 'contain',
                background: '#1a1a2e'
              }}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tomar foto"
      size="md"
      closeOnOverlayClick={false}
      closeOnEscape={true}
      footer={modalFooter}
    >
      {modalBody}
    </Modal>
  );
};