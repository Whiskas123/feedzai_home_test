"use client";

import React, { useEffect, useState } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";

import {
  XYChart,
  LineSeries,
  Axis,
  Tooltip,
  AreaSeries,
  AreaStack,
} from "@visx/xychart";

import {
  Annotation,
  HtmlLabel,
  Label,
  Connector,
  CircleSubject,
  LineSubject,
} from "@visx/annotation";

import { extent, max, min } from "d3-array";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

// Define the type for your data points
type DataPoint = { x: string; y: number };
type ContinentData = { [key: string]: DataPoint[] };
type YearlyData = { [year: string]: number };

const LineChart = () => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  type DataPoint = { x: string; y: number };
  const [totalData, setTotalData] = useState<DataPoint[]>([]);
  const [continentData, setContinentData] = useState<ContinentData>({});
  const [countryData, setCountryData] = useState<ContinentData>({});
  const [chartTitle, setChartTitle] = useState("Total Number of Refugees");
  const [state, setState] = useState<number>(0);
  const titleRef = React.useRef(null);
  const continentColors = {
    Europe: "#F7E733", // less pastel green
    Africa: "#f07c42", // less pastel orange
    Asia: "#41E2BA", // less pastel yellow
    "North America": "#155b5e", // less pastel light green
    "South America": "#6f9a0a", // less pastel dark green
    Oceania: "#2B2D42", // less pastel red
  };
  const specificYear = "1966";
  const dataPointIndex = totalData.findIndex((d) => d.x === specificYear);
  const dataPointToAnnotate = totalData[dataPointIndex];

  const yExtent = React.useMemo(() => {
    const yMin = min(totalData, (d) => d.y) ?? 0;
    const yMaxValue = max(totalData, (d) => d.y);
    return [yMin, yMaxValue != null ? yMaxValue + 5000000 : 0];
  }, [totalData]);

  const yExtentCountry = React.useMemo(() => {
    const yValues = Object.values(countryData)
      .flat()
      .map((d) => d.y);
    return [Math.min(...yValues, 0), Math.max(...yValues, 0)];
  }, [countryData]);

  const xScale = React.useMemo(() => {
    return scaleBand({
      range: [0, width], // You need to define the width of your chart
      domain: totalData.map((d) => d.x),
      padding: 0.1, // Optional, for spacing between bands
    });
  }, [totalData, width]); // Include width in the dependency array if it's dynamic

  const yScale = React.useMemo(() => {
    return scaleLinear({
      range: [height, 0], // Typically inverted for y-axis in charts
      domain: state !== 2 ? yExtent : yExtentCountry,
    });
  }, [state, yExtent, yExtentCountry, height]);

  console.log(xScale(dataPointToAnnotate.x));
  console.log(yScale(dataPointToAnnotate.y));

  useEffect(() => {
    const fetchData = async (type: string) => {
      let url = "";
      if (type === "total") {
        url = "/static/data/origin_totals.json";
      } else if (type === "continent") {
        url = "/static/data/origin_continent_totals.json";
      } else if (type === "country") {
        url = "/static/data/origin.json";
      }
      const response = await fetch(url);
      const newData = await response.json();

      const formattedData: DataPoint[] = [];
      const formattedDataContinent: ContinentData = {};

      if (type === "total") {
        Object.keys(newData).forEach((year: string) => {
          formattedData.push({
            x: year,
            y: newData[year],
          });
        });
        setTotalData(formattedData);
      } else {
        Object.entries(newData as { [continent: string]: YearlyData }).forEach(
          ([continent, values]) => {
            formattedDataContinent[continent] = Object.keys(values).map(
              (year: string) => ({
                x: year,
                y: values[year],
              })
            );
          }
        );
      }
      if (type === "total") {
        setTotalData(formattedData);
      } else if (type === "continent") {
        setContinentData(formattedDataContinent);
      } else if (type === "country") {
        setCountryData(formattedDataContinent);
      }
    };

    fetchData("total");
    fetchData("continent");
    fetchData("country");

    if (state === 0) {
      gsap.to(titleRef.current, {
        duration: 0.3,
        opacity: 0,
        onComplete: () => {
          setChartTitle("Total Number of Refugees");
          gsap.to(titleRef.current, {
            duration: 0.3,
            opacity: 1,
          });
        },
      });
    } else if (state === 1) {
      gsap.to(titleRef.current, {
        duration: 0.3,
        opacity: 0,
        onComplete: () => {
          setChartTitle("Refugees per continent of origin");
          gsap.to(titleRef.current, {
            duration: 0.3,
            opacity: 1,
          });
        },
      });
    } else if (state === 2) {
      gsap.to(titleRef.current, {
        duration: 0.3,
        opacity: 0,
        onComplete: () => {
          setChartTitle("Refugees per country of origin");
          gsap.to(titleRef.current, {
            duration: 0.3,
            opacity: 1,
          });
        },
      });
    } else {
      gsap.to(titleRef.current, {
        duration: 0.3,
        opacity: 0,
        onComplete: () => {
          setChartTitle("");
          gsap.to(titleRef.current, {
            duration: 0.3,
            opacity: 1,
          });
        },
      });
    }

    gsap.utils.toArray<Element>(".text-box").forEach((box, i) => {
      ScrollTrigger.create({
        trigger: box,
        start: "top center",
        onEnter: () => {
          setState(i);
        },
        onEnterBack: () => {
          setState(i);
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [state]);

  const xAccessor = (d: DataPoint) => d.x;
  const yAccessor = (d: DataPoint) => d.y;

  return (
    <div className="whole-container">
      <div ref={titleRef} className="chart-title-container">
        <span>{chartTitle}</span>
        {state === 1 && (
          <div className="legend">
            {Object.entries(continentColors).map(([continent, color]) => (
              <div key={continent} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: color }}
                ></span>
                <span className="legend-text">{continent}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        className="text-boxes-container"
        style={{ flex: 1, overflowY: "scroll" }}
      >
        <div className="text-box">
          A figura do alojamento local foi introduzido em 2008, mas só em 2014
          passou o seu registo a ser obrigatório, passando os alojamentos deste
          tipo que já operavam antes a estar integrados nesta designação.
        </div>
        <div className="text-box">
          Desde essa altura, a oferta deste tipo de alojamentos não tem parado
          de crescer. O tamanho dos pontos representa a quantidade de ALs num
          mesmo número de porta.
        </div>
        <div className="text-box">
          À data de novembro de 2023, foram atribuídas no total 10463 licenças
          de alojamento local* na cidade do Porto.
        </div>
        <div className="text-box">
          À data de novembro de 2023, foram atribuídas no total 10463 licenças
          de alojamento local* na cidade do Porto.
        </div>
        <div className="text-box">
          À data de novembro de 2023, foram atribuídas no total 10463 licenças
          de alojamento local* na cidade do Porto.
        </div>
        <div className="text-box">
          À data de novembro de 2023, foram atribuídas no total 10463 licenças
          de alojamento local* na cidade do Porto.
        </div>
      </div>

      <ParentSize className="graph-container">
        {({ width: visWidth, height: visHeight }) => (
          <XYChart
            margin={{ top: 10, right: 10, bottom: 50, left: 80 }}
            width={visWidth}
            height={visHeight}
            xScale={{ type: "band" }}
            yScale={{
              type: "linear",
              domain: state !== 2 ? yExtent : yExtentCountry,
            }}
          >
            <Axis orientation="bottom" />
            <Axis orientation="left" />
            <Tooltip
              className="tooltip"
              showVerticalCrosshair
              snapTooltipToDatumX
              snapTooltipToDatumY
              renderTooltip={({ tooltipData, colorScale }) => (
                <>
                  {tooltipData?.nearestDatum?.datum
                    ? xAccessor(tooltipData.nearestDatum.datum as DataPoint)
                    : "No date"}
                  {Object.keys(tooltipData?.datumByKey ?? {})
                    .filter((key) => key)
                    .map((key) => ({
                      key,
                      value: yAccessor(
                        tooltipData?.datumByKey[key]?.datum as DataPoint
                      ),
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)
                    .map(({ key, value }) => {
                      if (value == null || Number.isNaN(value)) return null;
                      if (key === "total-series" && state !== 0) return null;
                      return (
                        <div key={key}>
                          <span
                            className="tooltip-text"
                            style={{
                              textDecoration:
                                tooltipData?.nearestDatum?.key === key
                                  ? "underline"
                                  : undefined,
                              fontWeight:
                                tooltipData?.nearestDatum?.key === key
                                  ? 600
                                  : 200,
                            }}
                          >
                            {key === "total-series" ? "Total" : key}
                            {": "}
                            {value < 10000
                              ? `${(value / 1e3).toFixed(2)}k`
                              : `${(value / 1e6).toFixed(2)}M`}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
            />

            {state === 0 && (
              <>
                <LineSeries
                  dataKey="total-series"
                  data={totalData}
                  xAccessor={xAccessor}
                  yAccessor={yAccessor}
                />
                {dataPointToAnnotate && (
                  <Annotation
                    x={xScale(dataPointToAnnotate.x) ?? 0}
                    y={yScale(dataPointToAnnotate.y) ?? 0}
                    dx={-10}
                    dy={-10}
                  >
                    <Connector stroke="black" />
                    <CircleSubject
                      stroke="black"
                      // Adjust the radius as needed
                      r={4}
                    />
                    <Label
                      title="1966"
                      horizontalAnchor="middle"
                      verticalAnchor="middle"
                      showBackground={false}
                      showAnchorLine={false}
                      width={50}
                      fontColor="black"
                    />
                  </Annotation>
                )}
              </>
            )}
            {state === 1 && (
              <AreaStack>
                {Object.entries(continentData).map(
                  ([continentName, series], index) => (
                    <AreaSeries
                      key={index}
                      dataKey={`${continentName}`}
                      data={series}
                      xAccessor={xAccessor}
                      yAccessor={yAccessor}
                      fill={
                        continentColors[
                          continentName as keyof typeof continentColors
                        ]
                      }
                      stroke={
                        continentColors[
                          continentName as keyof typeof continentColors
                        ]
                      }
                    />
                  )
                )}
              </AreaStack>
            )}
            {state === 2 &&
              Object.entries(countryData).map(
                ([countryName, series], index) => (
                  <LineSeries
                    key={index}
                    dataKey={`${countryName}`}
                    data={series}
                    xAccessor={xAccessor}
                    yAccessor={yAccessor}
                  />
                )
              )}
          </XYChart>
        )}
      </ParentSize>
    </div>
  );
};

export default LineChart;
