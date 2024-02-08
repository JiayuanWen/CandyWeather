// Essentials
import React, {useEffect, useState, useRef} from 'react';
import axios from 'axios';

// Components
import NoConnectionPrompt from '../error_noConnection/NoConnection';
import InvalidQueryPrompt from '../error_invalidQuery/InvalidQuery';

// Images
import searchIcon from './search_icon.svg';
import refreshIcon from './refresh.svg'
import myLocationIcon from './my_location.svg'

// Functions
import { openweather_api } from './api';
import { weatherIcon } from './weatherIcon';
import { getCoord } from './getCoordintes';
//import { delay } from '../misc_scripts/delay';

// Stylesheets
import './weather.css';


const debug_output = false;

function WeatherInfo({color_mode, unit}) {
    const [weather_data, setWeatherData] = useState({});
    const [app_init, setAppInit] = useState('1'); 
    const [app_status, setStatus] = useState('Initial');
    const [location, setLocation] = useState(''); 
    const [location_pre, setLocationPre] = useState(''); // For turning search icon to refresh, cause you refresh data when searching the same thing.
    
    // For passing states to setInterval
    // https://github.com/facebook/react/issues/14010
    // https://upmostly.com/tutorials/settimeout-in-react-components-using-hooks
    const locationRef = useRef(location); locationRef.current = location;
    const unitRef = useRef(unit); unitRef.current = unit;
    
    // Set user current location as default
    // API source: https://locationiq.com/
    const currentLocation = (event) => {

        getCoord().then((response) => {
            debug_output ? (() => {console.log(`User location data:`);console.log(response);console.log("")})() : void(0);
            var lat = response.coords.latitude;
            var lon = response.coords.longitude;

            // Get location data from api
            axios.get("https://us1.locationiq.com/v1/reverse.php?key=pk.e3db4461beb1fe1f9b33ecaa7ff62569&lat=" + lat + "&lon=" + lon + "&format=json")
            .then((response) => {
                debug_output ? (() => {console.log(`Location API response:`);console.log(response.data);console.log("")})() : void(0);
                var location_local= null;

                if (response.data.address.suburb) {
                    location_local = response.data.address.suburb;
                }
                else if (response.data.address.county) {
                    location_local = response.data.address.county;
                }
                else if (response.data.address.neighbourhood) {
                    location_local = response.data.address.neighbourhood;
                }
                else if (response.data.address.city) {
                    location_local = response.data.address.city;
                }
                setLocation(location_local);
                document.getElementById("location-search-input").value = ""; // Clear search input field
                setStatus('Ok');
            })
            .catch((error) => {
                debug_output ? (() => {console.log(`Location API error: ${error.message}`);console.log("")})() : void(0);
                setStatus(error.message);
            },[])
        })
        .catch((error) => {
            setStatus(error.message);
        })
    }
    // For strange use of useEffect below, see https://www.w3schools.com/react/react_useeffect.asp
    //
    // Set location variable to user's current city on app first launch.
    useEffect(()=>{
        currentLocation();
    },[]);
    // Render the page to latest state after above useEffect changes location variable (React stays one step behind).
    // `app_init` acts as signal flag to prevent functions from undesirably execute more than once.
    useEffect((e)=>{
        // Hook executed due to app initial launch
        if (app_init === '1') {
            void(0);
            setAppInit('2');
        }
        // Change to `location` variable from currentLocation() causes another execution of this hook in the same
        // instance, we take this oppotunity to render the page to latest state with getWeatherData().
        else if (app_init === '2') {
            getWeatherData(e,true);
            setAppInit('3');
        }
        // Every subsequence changes to `location` via the search bar will trigger this hook. We don't want that,
        // so this hook will do nothing at this point and onward.
        else {
            void(0);
        }
        
    },[location]);

    // Get weather data
    // Weather data & API source: https://openweathermap.org/
    const getWeatherData = (event, search_icon_click, this_location, this_unit) => {
        
        // Some user may execute this function by pressing the search icon, we make sure the function
        // don't check for key press (event.key) since there is none (prevent null variable error). 
        if (search_icon_click) {
            void(0);
        }
        // Since this function executes on every key the user presses (onKeyPress in <input/>),
        // we only truly execute this if user pressed the enter key.
        else if (event.key === "Enter") {
            void(0);
        }
        else {
            return null;
        }

        // Determine which location and unit variable to use
        var url;
        if (this_location) { // If coming from setInterval, in which case location and unit will be blank, use passed variables this_* instead.
            console.log("App: Current location is "+this_location);
            url = `https://api.openweathermap.org/data/2.5/weather?q=${this_location}&appid=${openweather_api()}&units=${this_unit}`;
        } else { // If coming from app function calls itself, in which case location and unit will be intact, use those as normal.
            console.log("App: Current location is "+location);
            url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${openweather_api()}&units=${unit}`;
        }

        axios.get(url)
            // Get responses fron OpenWeather URL with location set
            .then((response) => {
                debug_output ? console.log("OpenWeather URL:"+url) : void(0);
                debug_output ? (() => {console.log(`OpenWeather Response:`);console.log(response.data);console.log("")})() : void(0);

                setWeatherData(response.data); app_init === "3" ? setLocationPre(location) : void(0); 
                setStatus('Ok');
            })
            // In case OpenWeather respond with error
            .catch((error) => {
                debug_output ? (() => {console.log(`OpenWeather error: ${error.message}`);console.log("")})() : void(0);

                setStatus(error.message);
                
                // For preventing search icon from turning into refresh when unneeded 
                setLocationPre('NA.');

                setWeatherData({});
                
            })
    }
    const search_bar = (
        <div className="location-search">
            <md-ripple></md-ripple>
            <search-bar 
                class={`location-search-bar material-container${color_mode === "light" ? "" : "-dark"}`}
            >
                <input 
                    className={`material-container${color_mode === "light" ? "" : "-dark"} material-text${color_mode === "light" ? "-dark-pure" : "-light-pure"}`}
                    id="location-search-input" 
                    type="text" 
                    placeholder="Enter location name..." 
                    //value={location} // Causes glitched output, unuse for now.

                    // Set location first, this will then modify the location query/parameter in OpenWeather URL
                    onChange={(event) => {
                        setLocation(event.target.value); 
                        debug_output ? console.log(event.target.value) : void(0);
                    }} 
                    // Use the finished OpenWeather URL to get data
                    onKeyUp={(event) => {
                        //console.log(event.code);
                        if (event.code === "Enter") {
                            getWeatherData(event,false);
                        }
                    }} 
                />
                <img 
                    src={location === location_pre ? refreshIcon : searchIcon} 
                    onClick={function(e) {getWeatherData(e,true);}} 
                    id="search-icon" 
                    class={`material-icons ${color_mode === "light" ? "icon-dark" : "icon-light"}`}>
                </img>
                
            </search-bar>
        </div>
    );
    // Refresh weather data when switching between Metric and Imperial unit.
    useEffect((e) => {
        getWeatherData(e,true);
    },[unit]);
    // Refresh weather data every 30 minutes
    useEffect((e) => {
        const intervalRefresh = setInterval((e) => {
            getWeatherData(e, true, locationRef.current, unitRef.current); // Pass location and unit reference because states does not cross setInterval on its own.
            console.log("App: Weather information updated.");
        }, 1800000); //Default 1800000ms

        return () => clearInterval(intervalRefresh);

        
    },[])

    // User current location button
    const user_location = (
        <div 
            className={`location-current material-container${color_mode === "light" ? "":"-dark"}`}
        >
            <md-ripple></md-ripple>
            <img 
                src={myLocationIcon} 
                alt="Current location icon"
                onClick={(e) => {
                    currentLocation();
                    setAppInit('2');
                }}
                className={`location-current-icon ${color_mode === "light" ? "":"icon-light"}`}
            ></img>
        </div>
        
    );

    // City/Town name
    const city_name = (
        <div 
            className={`city-name material-text${color_mode === "light"?"-dark-pure":"-light"}`}
        >
            {weather_data.main ? <p>{weather_data.name}</p> : <p></p>}
            
        </div>
    );

    // Temperature reading
    const temperature = (
        weather_data.main ? 
            <div 
                className={`temperature material-text${color_mode === "light"?"-dark-pure":"-light"}`}
            >
                <h1 className="temperature-read">
                    <span className="temperature-read-value">{Math.round(weather_data.main.temp)}</span> <span className="notranslate temperature-unit">{unit === "metric" ? <>°C</> : <>°F</>}</span>
                </h1>
            </div>
        :
            <div className="temperature">
                <h1 className="temperature-read">
                </h1>
            </div>
    );
    // Weather description/icon
    if (weather_data.weather) {
        debug_output ? console.log(weatherIcon(weather_data.weather[0].main)) : void(0);
    }
    const weather_icon = (
        weather_data.weather ?
            <div 
                className={`weather-desc material-text${color_mode === "light"?"-dark-pure":"-light"}`}
            >
                {/*Weather description is stored in an element of the array[size 1] named `weather`, so we have `[0]`*/}
                <span>{weatherIcon(weather_data.weather[0].main)}</span>
            </div>
        :
            <div className="weather-desc">
                <span>{weatherIcon("None")}</span>
            </div>
    );

    // Other weather readings
    const info_extra = (
        weather_data.main ?
            <div 
                className={`weather-info-extra material-container${color_mode === "light" ? "":"-dark"} material-text${color_mode === "light" ? "-dark-pure" : "-light-pure"}`}
            >
                { //Feels like
                    weather_data.main.feels_like ?
                        <div className="temperature-feel">
                            <span className="weather-info-extra-value">{Math.round(weather_data.main.feels_like)} <span className="notranslate temperature-unit">{unit === "metric" ? <>°C</> : <>°F</>}</span></span>
                            <div>Feels like </div>
                        </div>
                    :
                        <></>
                }
                { //Wind speed
                    weather_data.wind.speed ?
                        <div className="wind">
                            
                            <span className="weather-info-extra-value">{weather_data.wind.speed}  <span className="notranslate wind-unit">{unit === "metric" ? <>m/s</> : <>mph</>}</span></span>
                            <div>Wind</div>
                        </div>
                    :
                        <></>
                }
                { //Humidity
                    weather_data.main.humidity ?
                        <div className="humidity">
                            
                            <span className="weather-info-extra-value notranslate">{weather_data.main.humidity} %</span>
                            <div>Humidity</div>
                        </div>
                    :
                        <></>
                }
                { //Atmosphere pressure
                    weather_data.main.pressure ?
                        <div className="pressure">
                            
                            <span className="weather-info-extra-value notranslate">{weather_data.main.pressure} hPa</span>
                            <div>Pressure</div>
                        </div>
                    :
                        <></>
                }
            </div>
        :
            <></>
    );

    // Final output //
    return (
        <>
        
        {search_bar} {user_location}

        <NoConnectionPrompt status={app_status} color_mode={color_mode}/>
        <InvalidQueryPrompt status={app_status} color_mode={color_mode}/>


        <div className="weather-info material-common" style={{zIndex:2}}>
            {city_name}
            <div className="weather-info-sub">
                {weather_icon}
                {temperature}
            </div>  
        </div>
        {info_extra}
        

        </>
    );
}

export default WeatherInfo;