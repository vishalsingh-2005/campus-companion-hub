import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Smartphone,
  Shield,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useDeviceFingerprint, useMarkAttendance } from '@/hooks/useSecureAttendance';
import { cn } from '@/lib/utils';

interface LocationState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
}

export default function MarkAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'location' | 'selfie' | 'scan'>('location');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { fingerprint } = useDeviceFingerprint();
  const { markAttendance, isSubmitting } = useMarkAttendance();

  useEffect(() => {
    async function fetchStudentId() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        setStudentId(data?.id || null);
      } catch (error) {
        console.error('Error fetching student:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentId();
    
    return () => {
      // Cleanup scanner and camera on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  const requestLocation = async () => {
    setLocation({ status: 'requesting' });
    
    if (!navigator.geolocation) {
      setLocation({ status: 'unavailable', error: 'Geolocation not supported' });
      return;
    }
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      
      setLocation({
        status: 'granted',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    } catch (error: any) {
      setLocation({
        status: 'denied',
        error: error.message || 'Location access denied',
      });
    }
  };

  const startScanner = () => {
    setScanning(true);
    setError(null);
    
    // Small delay to ensure the DOM element is ready
    setTimeout(() => {
      try {
        const scannerElement = document.getElementById('qr-reader');
        if (!scannerElement) {
          console.error('Scanner element not found');
          setError('Scanner initialization failed. Please refresh the page.');
          setScanning(false);
          return;
        }

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
          },
          false
        );
        
        scanner.render(
          async (decodedText) => {
            // QR code scanned successfully
            console.log('QR Scanned:', decodedText);
            setScanned(true);
            scanner.clear().catch(console.error);
            
            try {
              // Parse QR data
              const qrData = JSON.parse(decodedText);
              const { session_id, token } = qrData;
              
              if (!session_id || !token) {
                throw new Error('Invalid QR code format');
              }
              
              // Mark attendance
              const result = await markAttendance({
                session_id,
                qr_token: token,
                latitude: location.latitude,
                longitude: location.longitude,
                gps_accuracy: location.accuracy,
                device_fingerprint: fingerprint || undefined,
                selfie_url: selfieUrl || undefined,
              });
              
              if (result.success) {
                setAttendanceMarked(true);
              } else {
                setError(result.message || 'Failed to mark attendance');
                setScanned(false);
              }
            } catch (err: any) {
              console.error('QR Processing Error:', err);
              setError(err.message || 'Failed to process QR code');
              setScanned(false);
            }
          },
          (errorMessage) => {
            // Scan error - usually just means no QR found yet, ignore these
            if (!errorMessage.includes('No QR code found')) {
              console.debug('QR scan:', errorMessage);
            }
          }
        );
        
        scannerRef.current = scanner;
      } catch (err: any) {
        console.error('Scanner initialization error:', err);
        setError('Failed to start camera. Please check camera permissions.');
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startSelfieCapture = async () => {
    setCapturingSelfie(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Could not access camera for selfie',
        variant: 'destructive',
      });
      setCapturingSelfie(false);
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSelfieUrl(dataUrl);
    }
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCapturingSelfie(false);
  };

  const reset = () => {
    setCurrentStep('location');
    setScanned(false);
    setAttendanceMarked(false);
    setError(null);
    setSelfieUrl(null);
    setScanning(false);
    setLocation({ status: 'idle' });
  };

  const canProceedToSelfie = location.status === 'granted';
  const canProceedToScan = canProceedToSelfie && selfieUrl;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-16 w-16 text-warning mb-4" />
        <h2 className="text-xl font-semibold">Student Profile Not Found</h2>
        <p className="text-muted-foreground mt-2">
          Your account is not linked to a student profile. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mark Attendance"
        description="Scan the QR code displayed by your teacher to mark attendance"
      />

      {/* Success State */}
      {attendanceMarked && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-success">Attendance Marked!</h2>
            <p className="text-muted-foreground mt-2 text-center">
              Your attendance has been successfully recorded.
            </p>
            <Button onClick={reset} variant="outline" className="mt-6">
              <RefreshCw className="h-4 w-4 mr-2" />
              Mark Another
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !attendanceMarked && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={reset} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step Progress Indicator */}
      {!attendanceMarked && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            currentStep === 'location' ? "bg-primary text-primary-foreground" : 
            location.status === 'granted' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
          )}>
            <MapPin className="h-4 w-4" />
            <span>1. Location</span>
            {location.status === 'granted' && <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            currentStep === 'selfie' ? "bg-primary text-primary-foreground" : 
            selfieUrl ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
          )}>
            <Camera className="h-4 w-4" />
            <span>2. Selfie</span>
            {selfieUrl && <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            currentStep === 'scan' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <QrCode className="h-4 w-4" />
            <span>3. Scan QR</span>
          </div>
        </div>
      )}

      {/* Step 1: Location */}
      {!attendanceMarked && currentStep === 'location' && (
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Step 1: Enable Location</CardTitle>
            <CardDescription>
              We need your GPS location to verify you're in the classroom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {location.status === 'idle' && (
              <Button onClick={requestLocation} className="w-full" size="lg">
                <MapPin className="h-5 w-5 mr-2" />
                Enable Location Access
              </Button>
            )}
            
            {location.status === 'requesting' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Requesting location access...</p>
              </div>
            )}
            
            {location.status === 'granted' && (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                  <div>
                    <p className="font-medium text-success">Location Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Accuracy: {Math.round(location.accuracy || 0)}m
                    </p>
                  </div>
                </div>
                <Button onClick={() => setCurrentStep('selfie')} className="w-full" size="lg">
                  Continue to Selfie
                  <CheckCircle2 className="h-5 w-5 ml-2" />
                </Button>
              </>
            )}
            
            {(location.status === 'denied' || location.status === 'unavailable') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                  <div>
                    <p className="font-medium text-warning">Location Unavailable</p>
                    <p className="text-sm text-muted-foreground">
                      {location.error || 'Please enable location services in your browser'}
                    </p>
                  </div>
                </div>
                <Button onClick={requestLocation} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selfie */}
      {!attendanceMarked && currentStep === 'selfie' && (
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Step 2: Take a Selfie</CardTitle>
            <CardDescription>
              Capture a photo to verify your identity (may be required by your teacher)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selfieUrl && !capturingSelfie && (
              <div className="space-y-3">
                <Button onClick={startSelfieCapture} className="w-full" size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Take Selfie
                </Button>
                <Button 
                  onClick={() => setCurrentStep('scan')} 
                  variant="outline" 
                  className="w-full"
                >
                  Skip (if not required)
                </Button>
              </div>
            )}
            
            {capturingSelfie && (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black aspect-square object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <Button onClick={captureSelfie} className="w-full" size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Capture Photo
                </Button>
                <Button 
                  onClick={() => {
                    if (streamRef.current) {
                      streamRef.current.getTracks().forEach(track => track.stop());
                    }
                    setCapturingSelfie(false);
                  }} 
                  variant="ghost" 
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
            
            {selfieUrl && (
              <div className="space-y-4">
                <img
                  src={selfieUrl}
                  alt="Selfie"
                  className="w-full rounded-lg aspect-square object-cover"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelfieUrl(null)}
                  >
                    Retake
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setCurrentStep('scan')}
                  >
                    Continue
                    <CheckCircle2 className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setCurrentStep('location')}
            >
              ← Back to Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: QR Scan */}
      {!attendanceMarked && currentStep === 'scan' && (
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Step 3: Scan QR Code</CardTitle>
            <CardDescription>
              Point your camera at the QR code displayed by your teacher
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verification Summary */}
            <div className="flex gap-4 p-3 rounded-lg bg-muted/50 border mb-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Location</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Selfie</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="truncate">Device: {fingerprint?.slice(0, 8)}...</span>
              </div>
            </div>

            {!scanning ? (
              <Button onClick={startScanner} className="w-full" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Start QR Scanner
              </Button>
            ) : (
              <div className="space-y-4">
                <div 
                  id="qr-reader" 
                  className="rounded-xl overflow-hidden bg-muted"
                  style={{ width: '100%', minHeight: '300px' }}
                />
                {isSubmitting && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Submitting attendance...</span>
                  </div>
                )}
                <Button 
                  onClick={stopScanner} 
                  variant="outline" 
                  className="w-full"
                  disabled={scanned || isSubmitting}
                >
                  Cancel Scan
                </Button>
              </div>
            )}
            
            {scanned && !attendanceMarked && !error && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing attendance...</span>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setCurrentStep('selfie')}
              disabled={scanning}
            >
              ← Back to Selfie
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!attendanceMarked && (
        <Card>
          <CardHeader>
            <CardTitle>How to Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0">1</Badge>
                <span>Enable GPS location for classroom verification</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0">2</Badge>
                <span>Click "Start Scanner" and allow camera access</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0">3</Badge>
                <span>Point your camera at the QR code displayed by your teacher</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0">4</Badge>
                <span>Wait for confirmation message</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
