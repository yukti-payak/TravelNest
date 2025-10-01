// --- Step 1: Add your API Keys here ---
const OPENWEATHER_API_KEY = "addb43b1d86e71d770f4093b6a2a9f42";
// const OPENWEATHER_API_KEY = "cc129fc545d962e3a2d4316eedc0d6f4";
const UNSPLASH_ACCESS_KEY = "hF9CNqkHtbtXWciD9xJE_S0AuzuwfccWcb0yx2crzm4";

// --- WARNING ---
// For a real-world application, DO NOT expose your API keys on the front-end.
// This is for demonstration only. In production, you would have a backend
// server make these requests to protect your keys.

// --- DOM References ---
const card = document.getElementById("snapshot-card");
const cardState = document.getElementById("card-state");
const cardContent = document.getElementById("card-content");
// ... (other content elements)
const locationNameEl = document.getElementById("location-name");
const weatherIconEl = document.getElementById("weather-icon");
const weatherTempEl = document.getElementById("weather-temp");
const weatherDescEl = document.getElementById("weather-desc");
const sightingsGridEl = document.getElementById("sightings-grid");

// --- Input References ---
const locationInput = document.getElementById("location-input");
const searchBtn = document.getElementById("search-btn");
const useLocationBtn = document.getElementById("use-location-btn");

// --- UI State Management Functions ---
const showState = (htmlContent) => {
  cardContent.classList.remove("visible");
  cardState.innerHTML = htmlContent;
  cardState.style.display = "flex";
};

const showLoading = () => showState('<div class="loader"></div>');
const showError = (message) =>
  showState(`<h3>Error</h3><p>${message}</p>`);

const showContent = () => {
  cardState.style.display = "none";
  cardContent.classList.add("visible");
};

// --- Main Data Fetching and Building Function ---
async function fetchAndBuildSnapshot({ lat, lon, cityName }) {
  showLoading();
  let currentLat = lat;
  let currentLon = lon;
  let locationName = cityName;

  try {
    // If only cityName is provided, get coordinates first
    if (cityName && !lat) {
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${OPENWEATHER_API_KEY}`
      );
      if (!geoResponse.ok)
        throw new Error("Could not find that location.");
      const geoData = await geoResponse.json();
      if (geoData.length === 0)
        throw new Error(`Could not find location: ${cityName}`);
      currentLat = geoData[0].lat;
      currentLon = geoData[0].lon;
      locationName = geoData[0].name; // Use the more accurate name
    }

    // Fetch all data in parallel for speed
    const [weatherResponse, photoResponse, inaturalistResponse] =
      await Promise.all([
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${currentLat}&lon=${currentLon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        ),
        fetch(
          `https://api.unsplash.com/photos/random?query=nature,${
            locationName || "scenic"
          }&orientation=portrait&client_id=${UNSPLASH_ACCESS_KEY}`
        ),
        fetch(
          `https://api.inaturalist.org/v1/observations?lat=${currentLat}&lng=${currentLon}&radius=20&order_by=observed_on&order=desc&photos=true&per_page=10`
        ),
      ]);

    if (!weatherResponse.ok)
      throw new Error("Weather data not available.");
    if (!photoResponse.ok) throw new Error("Could not fetch photo.");
    if (!inaturalistResponse.ok)
      throw new Error("Sighting data not available.");

    const weatherData = await weatherResponse.json();
    const photoData = await photoResponse.json();
    const sightingsData = await inaturalistResponse.json();

    // --- Process and Update the DOM ---
    card.style.backgroundImage = `url('${photoData.urls.regular}')`;

    locationNameEl.textContent = locationName || weatherData.name;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
    weatherTempEl.textContent = Math.round(weatherData.main.temp);
    weatherDescEl.textContent = weatherData.weather[0].description;

    // Filter for top 2 unique species with photos
    const uniqueSightings = [];
    const seenTaxaIds = new Set();
    for (const s of sightingsData.results) {
      if (
        s.taxon &&
        !seenTaxaIds.has(s.taxon.id) &&
        s.photos.length > 0
      ) {
        uniqueSightings.push({
          name: s.taxon.preferred_common_name || s.taxon.name,
          photoUrl: s.photos[0].url.replace("square", "medium"),
        });
        seenTaxaIds.add(s.taxon.id);
      }
      if (uniqueSightings.length >= 2) break;
    }

    if (uniqueSightings.length > 0) {
      sightingsGridEl.innerHTML = uniqueSightings
        .map(
          (s) => `
                  <div class="sighting">
                      <img src="${s.photoUrl}" alt="${s.name}" />
                      <p>${s.name}</p>
                  </div>
              `
        )
        .join("");
    } else {
      sightingsGridEl.innerHTML =
        "<p style='grid-column: 1 / 3;'>No recent sightings found.</p>";
    }

    showContent();
  } catch (error) {
    console.error("Snapshot Error:", error);
    showError(error.message);
  }
}

// --- Event Listeners ---
searchBtn.addEventListener("click", () => {
  const cityName = locationInput.value.trim();
  if (cityName) {
    fetchAndBuildSnapshot({ cityName });
  }
});

locationInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchBtn.click();
  }
});

useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchAndBuildSnapshot({ lat: latitude, lon: longitude });
    },
    () => {
      showError(
        "Unable to retrieve your location. Please grant permission or enter a city manually."
      );
    }
  );
});