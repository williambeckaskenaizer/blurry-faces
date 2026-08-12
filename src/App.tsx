/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import './App.css';
import scarySound from './assets/scary.mp3';
import notification from './assets/notification.mp3';
import { HistogramHUD } from './components/Histogram';


const API_KEY = import.meta.env.VITE_GOOGLE_STREETVIEW_API_KEY;

const CITIES = {
  "Tokyo": { lat: 35.6895, lng: 139.6917 },
  "New York": { lat: 40.7128, lng: -74.0060 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Paris": { lat: 48.8566, lng: 2.3522 },
  "London": { lat: 51.5074, lng: -0.1278 },
  "Rome": { lat: 41.9028, lng: 12.4964 },
  "Lisbon": { lat: 38.7223, lng: -9.1393 },
  "Bangkok": { lat: 13.7563, lng: 100.5018 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Cairo": { lat: 30.0444, lng: 31.2357 },
  "Rio de Janeiro": { lat: -22.9068, lng: -43.1729 },
  "Sydney": { lat: -33.8688, lng: 151.2093 },
  "Seoul": { lat: 37.5665, lng: 126.9780 },
} as const;


const LENSES = {
  "35mm": 1.73,
  "50mm": 2.20,
  "80mm": 2.85,
  "120mm": 3.40
};

const FILM_STOCKS = {
  "None": "",
  "Kodak Gold 200": "film-gold",
  "Kodak Portra 400": "film-portra",
  "Fujicolor Super 200": "film-fuji",
  "CineStill 800T": "film-cinestill",
  "Colorplus 200": "film-colorplus",
};

const GRAIN_SVG_URL = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [streetView, setStreetView] = useState<google.maps.StreetViewPanorama | null>(null);
  const [activeLens, setActiveLens] = useState("35mm");
  const [activeFilm, setActiveFilm] = useState("film-gold");
  const [showGrain, setShowGrain] = useState(false);
  const [showClosePopup, setShowClosePopup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHistogram, setShowHistogram] = useState(true);
  const [exposureStep, setExposureStep] = useState<number>(0);

  const [isCooldown, setIsCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatEV = (step: number): string => {
    const ev = step / 3;
    if (step === 0) return "0.0 EV";
    const sign = step > 0 ? "+" : "";
    return `${sign}${ev.toFixed(1)} EV`;
  };

  const exposureBrightness = Math.pow(2, exposureStep / 3);

  const getRandomCityName = (): keyof typeof CITIES => {
    const cityKeys = Object.keys(CITIES) as (keyof typeof CITIES)[];;
    return cityKeys[Math.floor(Math.random() * cityKeys.length)];
  };

  const [activeCity, setActiveCity] = useState(getRandomCityName);


  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);

    let frames = 0;
    const interval = setInterval(() => {
      window.dispatchEvent(new Event('resize'));
      frames++;
      if (frames > 20) clearInterval(interval);
    }, 20);
  };

  const handleClose = () => {
    setShowClosePopup(false);
  };

  const playScaryChiblee = () => {
    const audio = new Audio(scarySound);
    audio.play().catch((error) => {
      console.error("Playback failed or was blocked by browser permissions:", error);
    });
  };

  const playNotification = () => {
    const audio = new Audio(notification);
    audio.play().catch((error) => {
      console.error("Playback failed or was blocked by browser permissions:", error);
    });
  };

  const popupNotification = () => {
    playNotification();
    setShowClosePopup(true);
  }

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        initMap();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (mapRef.current && window.google) {
        const panorama = new google.maps.StreetViewPanorama(mapRef.current, {
          position: CITIES[activeCity],
          pov: { heading: 165, pitch: 0 },
          zoom: LENSES["35mm"],
          disableDefaultUI: true,
          linksControl: true,
          clickToGo: true,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        });
        setStreetView(panorama);
      }
    };

    loadGoogleMaps();
  }, []);

  const dropInCity = (cityName: keyof typeof CITIES) => {

    if (isCooldown) return;

    setIsCooldown(true);

    if (!streetView) return;
    setActiveCity(cityName)
    const svService = new google.maps.StreetViewService();
    const cityCoords = CITIES[cityName];
    const randomLat = cityCoords.lat + (Math.random() - 0.5) * 0.1;
    const randomLng = cityCoords.lng + (Math.random() - 0.5) * 0.1;

    svService.getPanorama(
      {
        location: { lat: randomLat, lng: randomLng },
        radius: 10000,
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (status === "OK" && data?.location?.latLng) {
          streetView.setPosition(data.location.latLng);
        } else {
          streetView.setPosition(cityCoords);
        }
      }
    );

    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setIsCooldown(false);
    }, 1000);
  };

  const changeLens = (lensName: keyof typeof LENSES) => {
    if (!streetView) return;
    streetView.setZoom(LENSES[lensName]);
    setActiveLens(lensName);
  };



  const takePhoto = async () => {
    if (!streetView || !mapRef.current) return;
    const pov = streetView.getPov();
    const zoom = streetView.getZoom();
    const panoId = streetView.getPano();

    if (!panoId) return;

    const width = mapRef.current.clientWidth;
    const height = mapRef.current.clientHeight;
    const aspect = width / height;

    let reqWidth = 640;
    let reqHeight = Math.round(640 / aspect);
    if (reqHeight > 640) {
      reqHeight = 640;
      reqWidth = Math.round(640 * aspect);
    }

    const currentFov = 180 / Math.pow(2, zoom || 1);
    const staticUrl = `https://maps.googleapis.com/maps/api/streetview?size=${reqWidth}x${reqHeight}&pano=${panoId}&heading=${pov.heading}&pitch=${pov.pitch}&fov=${currentFov}&key=${API_KEY}`;

    try {
      const response = await fetch(staticUrl);
      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");

        const scale = 2;
        canvas.width = reqWidth * scale;
        canvas.height = reqHeight * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        let filterStr = "none";
        if (activeFilm === "Kodak Gold 200") filterStr = "sepia(0.25) saturate(1.3) contrast(1.05) brightness(0.98) hue-rotate(-5deg)";
        else if (activeFilm === "Kodak Portra 400") filterStr = "sepia(0.1) saturate(1.05) contrast(0.95) brightness(1.0)";
        else if (activeFilm === "Fujicolor Super 200") filterStr = "saturate(1.3) contrast(1.05) hue-rotate(5deg)";
        else if (activeFilm === "Colorplus 200") filterStr = "sepia(0.35) saturate(1.2) contrast(1.08) brightness(0.95)";
        else if (activeFilm === "CineStill 800T") filterStr = "contrast(1.1) saturate(1.2) brightness(0.88) sepia(0.15) hue-rotate(-15deg)";

        ctx.filter = filterStr;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (activeFilm === "CineStill 800T") {
          ctx.filter = "none";
          ctx.globalCompositeOperation = "lighten";
          ctx.fillStyle = "rgba(0, 40, 80, 0.2)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (showGrain && activeFilm !== "None") {
          let opacity = 0.2;
          if (activeFilm === "Kodak Gold 200") opacity = 0.2;
          else if (activeFilm === "Kodak Portra 400") opacity = 0.12;
          else if (activeFilm === "Fujicolor Super 200") opacity = 0.18;
          else if (activeFilm === "Colorplus 200") opacity = 0.28;
          else if (activeFilm === "CineStill 800T") opacity = 0.35;

          await new Promise<void>((resolve) => {
            const grainImg = new Image();
            grainImg.onload = () => {
              ctx.filter = "none";
              ctx.globalAlpha = opacity;
              ctx.globalCompositeOperation = activeFilm === "CineStill 800T" ? "color-burn" : "overlay";
              const ptr = ctx.createPattern(grainImg, "repeat");
              if (ptr) {
                ctx.fillStyle = ptr;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              resolve();
            };
            grainImg.src = GRAIN_SVG_URL;
          });
        }

        // Trigger clean download
        const finalImgUrl = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.href = finalImgUrl;
        const safeName = activeFilm.replace(/\s+/g, '-').toLowerCase();
        link.download = `street_photo_${safeName}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(imgUrl);
      };
      img.src = imgUrl;
    } catch (error) {
      console.error("Error capturing photo:", error);
      alert("Failed to capture photo. Ensure your API key has the Street View Static API enabled.");
    }
  };

  return (
    <div className="desktop-wrapper">

      {showClosePopup && (
        <div className="aero-modal-overlay" onClick={() => setShowClosePopup(false)}>
          {/* Prevent closing when clicking inside the window itself */}
          <div className="aero-window aero-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="aero-titlebar">
              <span><p className="aero-titlebar-text">Why</p></span>
              <div className="aero-caption">
                <button
                  className="close"
                  type="button"
                  aria-label="Close"
                  onClick={() => setShowClosePopup(false)}
                ></button>
              </div>
            </div>

            <div className="aero-dialog-body">
              <div className="aero-dialog-content">
                <span className="aero-dialog-icon">⚠️</span>
                <p>No {">:("}</p>
              </div>

              <div className="aero-dialog-actions">
                <button className="inner-button dialog-btn" onClick={handleClose}>
                  Understandable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="desktop-workspace">

        {/* SIDEBAR WINDOW */}
        <div className={`aero-window sidebar ${!showSidebar ? 'minimized' : ''}`}>
          <div className="aero-titlebar">
            <div className="aero-titlebar">
              <svg className="aero-titlebar-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="14" rx="2" fill="#4a90d9" />
                <rect x="4" y="4" width="8" height="1.5" rx="0.75" fill="#fff" />
                <rect x="4" y="7" width="8" height="1.5" rx="0.75" fill="#fff" />
              </svg>
              <span><p className="aero-titlebar-text">Control Panel</p></span>
            </div>
            <div className="aero-caption">
              <button
                className="min"
                type="button"
                aria-label="Minimize"
                onClick={toggleSidebar} /* Minimize Handler */
              ></button>
              <button className="max" type="button" aria-label="Maximize"></button>
              <button onClick={() => popupNotification()} className="close" type="button" aria-label="Close"></button>
            </div>
          </div>

          <div className="aero-body" style={{ overflowY: 'auto' }}>
            <div className="group-box" data-title="Locations">
              {Object.keys(CITIES).map((city) => (
                <button disabled={isCooldown} style={{ fontWeight: activeCity === city ? 'bold' : 'normal' }} className='inner-button' key={city} onClick={() => dropInCity(city as keyof typeof CITIES)}>
                  {city}  {activeCity === city && '◄'} {(isCooldown && activeCity == city) && "⏳"} 
                </button>
              ))}
            </div>

            <div className="group-box" data-title="Lenses (Focal Length)">
              {Object.keys(LENSES).map((lens) => (
                <button
                  className='inner-button'
                  key={lens}
                  onClick={() => changeLens(lens as keyof typeof LENSES)}
                  style={{ fontWeight: activeLens === lens ? 'bold' : 'normal' }}
                >
                  {lens} {activeLens === lens && '◄'}
                </button>
              ))}
            </div>

            <div className="group-box" data-title="Film Stock">
              <select
                value={activeFilm}
                onChange={(e) => setActiveFilm(e.target.value)}
                className="aero-select"
              >
                {Object.entries(FILM_STOCKS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {/* Handles both string labels and object metadata ({ name: 'Kodak Gold 200' }) */}
                    {typeof value === 'object' && value !== null && 'name' in value
                      ? (value as { name: string }).name
                      : String(key)} 
                  </option>
                ))}
              </select>
            </div>



            <div className="group-box" data-title="Display Settings">
              <div className="exposure-control">
                <div className="exposure-header">
                  <span className="exposure-label">Exposure Compensation</span>
                  <span className="exposure-value">{formatEV(exposureStep)}</span>
                </div>

                {/* Slider set to -9 to +9 range */}
                <input
                  type="range"
                  min="-9"
                  max="9"
                  step="1"
                  value={exposureStep}
                  onChange={(e) => setExposureStep(Number(e.target.value))}
                  className="aero-slider"
                />

                {/* Stop Tick Marks */}
                <div className="exposure-ticks">
                  <span>-3</span>
                  <span>-2</span>
                  <span>-1</span>
                  <span>0</span>
                  <span>+1</span>
                  <span>+2</span>
                  <span>+3</span>
                </div>
              </div>
              <label className="aero-checkbox-label">
                <input
                  type="checkbox"
                  checked={showHistogram}
                  onChange={(e) => setShowHistogram(e.target.checked)}
                />
                Show Histogram
              </label>
            </div>

            {/* <div className="group-box" data-title="Capture">
              <button className="shutter-btn inner-button" onClick={takePhoto}>
                📷 SHUTTER
              </button>
            </div> */}

          </div>
        </div>

        {/* VIEWFINDER / MAP WINDOW */}
        <div className="aero-window map-window">


          <button className="shutter-btn overlay-shutter-btn" onClick={takePhoto}>
            📷
          </button>
          <div style={{ position: 'absolute', bottom: '30px', left: '4%', transform: 'translateX(-50%)', zIndex: 20 }}>
            {showHistogram && <HistogramHUD activeFilm={activeFilm} />}
          </div>



          <div className="aero-titlebar">
            <div className="aero-titlebar">
              <p>📷</p>
              <span><p className="aero-titlebar-text">Viewfinder</p></span>
            </div>
            <div className="aero-caption">
              <button className="min" type="button" aria-label="Minimize"></button>
              <button className="max" type="button" aria-label="Maximize"></button>
              <button onClick={() => popupNotification()} className="close" type="button" aria-label="Close"></button>
            </div>
          </div>

          <div className="content-area map-content-area">
            <div
              className={`viewfinder-container ${FILM_STOCKS[activeFilm as keyof typeof FILM_STOCKS]}`}
              style={{ filter: `brightness(${exposureBrightness})` }}>
              <div id="map" ref={mapRef}></div>

              <div className="color-grade-overlay"></div>
              <div className="grain-overlay" style={{ display: showGrain ? 'block' : 'none' }}></div>

            </div>

          </div>
        </div>

      </div>

      <div className="aero-taskbar">
        <div onClick={playScaryChiblee} className="start-orb" title="Start">
        </div>

        <div
          className={`taskbar-item ${showSidebar ? 'active' : 'minimized'}`}
          onClick={toggleSidebar}
        >
          <span>🛠️</span>
          <span>Control Panel</span>
        </div>

        <div className="taskbar-item active">
          <span>📷</span>
          <span>Viewfinder</span>
        </div>
      </div>
    </div >
  );
}