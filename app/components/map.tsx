import useSWR from "swr";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import fetcher from "../libs/fetcher";
import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

// @ts-ignore

mapboxgl.accessToken =
  "pk.eyJ1IjoiY2xhdWRpb2xlbW9zIiwiYSI6ImNsMDV4NXBxajBzMWkzYm9ndXhzbTk5ZHkifQ.85n9mjZbTDUpyQZrrJTBwA";

const useData = (path: string) => useSWR<any>(`./static/data/${path}`, fetcher);

const circlePaint = (year: number): mapboxgl.CirclePaint => ({
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["get", year.toString()],
    0,
    0,
    1000,
    1,
    10000,
    3,
    100000,
    10,
    6000000,
    60,
  ],
  "circle-color": "#012169",
  "circle-radius-transition": { duration: 2000, delay: 0 },
});

const Map = () => {
  const data = useData("geojson_new.json").data;
  const divTrigger = React.useRef(null!);
  const mapPin = React.useRef(null!);

  const mapContainer = React.useRef(null!);
  const progressBar = React.useRef(null!);
  const map = useRef<mapboxgl.Map | null>(null);

  const [normalizedDate, setNormalizedDate] = React.useState(0);
  const [barWidth, setBarWidth] = React.useState("0%");
  const [hoveredFeature, setHoveredFeature] = React.useState(null);
  const [ranking, setRanking] = React.useState([]);
  const [totalRefugees, setTotalRefugees] = React.useState(0);
  const formatDate = (value: number) => {
    const startYear = 1951;
    const endYear = 2023;
    const yearRange = endYear - startYear;
    const year = Math.round(startYear + value * yearRange);
    return year.toString();
  };

  // Function to update the ranking based on the normalizedDate
  const updateRanking = (year: string) => {
    if (!data || !data.features) return;
    console.log(year);

    const total = data.features.reduce((sum, feature) => {
      const refugees = feature.properties[year.toString()] || 0;
      return sum + refugees;
    }, 0);
    setTotalRefugees(total);

    const rankingData = data.features
      .map((feature) => ({
        country: feature.properties.country,
        refugees: feature.properties[year.toString()],
      }))
      .sort((a, b) => b.refugees - a.refugees)
      .slice(0, 10); // Get top 10 countries

    setRanking(rankingData);
  };

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  gsap.registerPlugin(ScrollTrigger);

  const normalizedDateRef = useRef(normalizedDate);

  useEffect(() => {
    // Update the ref each time the state changes
    normalizedDateRef.current = normalizedDate;
    const year = formatDate(normalizedDate);
    updateRanking(year);
  }, [normalizedDate, data]);

  useEffect(() => {
    document.body.style.overflow = !map.current
      ? "hidden"
      : map.current.loaded()
      ? "scroll"
      : "hidden";

    if (data) {
      if (map.current) return;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v10?optimize=true",
        center: [-30, 40],
        zoom: 1.7,
        interactive: false,
      });

      map.current.on("load", () => {
        document.body.style.overflow = "scroll";

        // SCROLL TRIGGERS

        ScrollTrigger.create({
          id: "map-pin",
          trigger: divTrigger.current,
          start: "top top",
          end: "bottom bottom",
          pin: mapPin.current,
          pinSpacing: true,
          toggleClass: "active",
        });

        ScrollTrigger.create({
          id: "progress-bar-pin",
          trigger: divTrigger.current,
          start: "top top",
          end: "bottom bottom",
          pin: progressBar.current,
          pinSpacing: false,
          toggleClass: "active", // Ensure this is the correct reference to the element you want to pin
        });

        ScrollTrigger.create({
          id: "progress-bar",
          trigger: divTrigger.current,
          start: "top top",
          //endTrigger: action1.current,
          end: "bottom bottom",
          pinSpacing: false,
          toggleClass: "active",

          onUpdate: (self) => {
            const scrollProgress = self.progress;
            const dateValue = gsap.utils.clamp(0, 1, scrollProgress);
            const year = formatDate(dateValue);
            setNormalizedDate(dateValue);
            setBarWidth(`${scrollProgress * 100}%`);
            if (map.current) {
              const currentYear = parseInt(year);
              // Set the circle paint properties with the transition
              map.current.setPaintProperty(
                "refugees",
                "circle-radius",
                circlePaint(currentYear)["circle-radius"]
              );
            }
          },
          onLeave: () =>
            gsap.to(".progress-bar", { opacity: 0, duration: 0.5 }),
          onEnterBack: () =>
            gsap.to(".progress-bar", { opacity: 1, duration: 0.5 }),
        });

        // MAPBOX SOURCES

        map.current?.addSource("data", {
          type: "geojson",
          data: data,
        });

        map.current?.addLayer({
          id: "refugees",
          type: "circle",
          source: "data",
          paint: circlePaint(1951),
        });
      });

      map.current.on("mousemove", "refugees", (e) => {
        // Change the cursor style as a UI indicator.
        map.current.getCanvas().style.cursor = "pointer";
        setHoveredFeature(e.features[0]);

        const coordinates = e.features[0].geometry.coordinates.slice();
        const countryName = e.features[0].properties.country;
        const year = formatDate(normalizedDateRef.current).toString(); // Replace 'name' with the actual property name for the country in your data
        const refugeesCount = e.features[0].properties[year];

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        popup
          .setLngLat(coordinates)
          .setHTML(
            `<strong>${countryName}</strong><br/>Refugees in ${year}: ${
              refugeesCount >= 1e6
                ? (refugeesCount / 1e6).toFixed(2) + "M"
                : refugeesCount >= 1e4
                ? refugeesCount / 1e3 + "k"
                : refugeesCount
            }`
          )
          .addTo(map.current);
      });

      map.current.on("mouseleave", "refugees", () => {
        map.current.getCanvas().style.cursor = "";
        popup.remove();
        setHoveredFeature(null);
      });
    }
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [data]);

  return (
    <>
      <div className="whole-container">
        <div ref={progressBar} className="progress-bar">
          <div className="progress-fill" style={{ width: barWidth }}>
            <div className="progress-fill-text" style={{ width: barWidth }}>
              {formatDate(normalizedDate)}
            </div>
          </div>
          {formatDate(normalizedDate)}
        </div>

        <div className="plot-full-screen"></div>

        <div ref={mapPin} className="map-content">
          <div ref={mapContainer} className="map-container" />
        </div>
        <div ref={divTrigger} className="text-boxes-container">
          <div className="title">Fleeing Home.</div>
          <div className="text-box">
            {" "}
            The United Nations High Commissioner for Refugees (UNHCR) dataset
            tells us the number of refugees from country of origin. starts in
            1951, but only contains data from 1960.
          </div>
          <div className="text-box">
            The first country to register refugees was Angola (Colonial War).
            The first country to get to a million refugees was China (Great
            Famine).
          </div>
          <div className="text-box">
            The 70s saw widespread conflit in may countries in Africa.
          </div>
          <div className="text-box" style={{ marginTop: "80vh" }}>
            The number of refugees skyrocketed in the 80s, specially due to a
            great famine in Ethopia and the Soviet-Afghan War.{" "}
          </div>
          <div className="text-box" style={{ marginTop: "100vh" }}>
            In the 90s, the origins of refugees became more widespread. Not only
            Africa and the Middle East, now South East Asia, Central America,
            the Balkans and the ex-Soviet Republics became huge sources of
            unrest.
          </div>
          <div className="text-box">
            The new millenium started with a considerable decrease in the number
            of refugees, from the peak of 14M to around 10M.
          </div>


          <div className="text-box">
            The Syrian Civil War, the Russian Invasion of Ukraine and the
            American retreat from Afghanistan resulted in an unprecedented
            number of refugees.
          </div>
          <div className="ending">Refugees in 2023: 30.245.002</div>
        </div>
      </div>
      <div className="legend-container">
        <div className="legend-title">Refugees by country of origin</div>
        <ul className="legend-ranking">
          {ranking.map((entry, index) => (
            <li key={index}>
              <span className="legend-country">{entry.country}</span>
              <span className="legend-refugees">
                {entry.refugees.toLocaleString()}
              </span>
            </li>
          ))}
          <li className="legend-total">
            <span className="legend-country">Total</span>
            <span className="legend-refugees">
              {totalRefugees.toLocaleString()}
            </span>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Map;
