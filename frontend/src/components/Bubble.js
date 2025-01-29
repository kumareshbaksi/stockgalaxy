import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import PopupGraph from "./PopupGraph";

const BubbleChart = ({ data, highlightedStock }) => {
  const svgRef = useRef();
  // Track the clicked bubble.
  const [selectedBubble, setSelectedBubble] = useState(null);
  // Ref to track bubble position.
  const selectedBubbleRef = useRef(null);

  useEffect(() => {
    if (selectedBubbleRef.current) {
      setSelectedBubble(selectedBubbleRef.current);
    }
  }, [selectedBubbleRef.current]);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight - 120;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      // Full screen black background.
      .style("background", "black")
      .style("display", "block")
      .style("margin", "auto");

    // Clear previous elements.
    svg.selectAll("*").remove();

    // Add gradients for bubble effects.
    const defs = svg.append("defs");
    data.forEach((d, i) => {
      const gradient = defs
        .append("radialGradient")
        .attr("id", `bubble-gradient-${i}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");

      // Dark center for depth.
      gradient
        .append("stop")
        .attr("offset", "60%")
        .attr("stop-color", "black")
        .attr("stop-opacity", 0.8);

      // Light reflection at 50%.
      gradient
        .append("stop")
        .attr("offset", "70%")
        // Bright green/red
        .attr("stop-color", d.change > 0 ? "#00ff00" : "#ff5555")
        .attr("stop-opacity", 0.6);

      // Subtle shadow effect
      gradient
        .append("stop")
        .attr("offset", "20%")
        // Dark green/red
        .attr("stop-color", d.change > 0 ? "#004d00" : "#8b0000")
        .attr("stop-opacity", 1);

      // Outer glow effect
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "black")
        .attr("stop-opacity", 1);
    });

    // Add glow effect for bubbles
    defs.append("filter").attr("id", "bubble-glow").html(`
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);

    // Define responsive size ranges
    const screenArea = window.innerWidth * window.innerHeight;
    const minSize = screenArea > 800000 ? 50 : screenArea > 400000 ? 30 : 40; 
    const maxSize = screenArea > 800000 ? 150 : screenArea > 400000 ? 100 : 70;
    const maxChange = Math.max(...data.map((d) => Math.abs(d.change))); 

    data.forEach((d) => {
      // Dynamically calculate size based on proportional mapping of 'change'
      d.size = minSize + (Math.abs(d.change) / maxChange) * (maxSize - minSize);

      // Helper to generate or retrieve saved positions
      const getOrSetPosition = (key, max, offset) => {
        let storedPositions =
          JSON.parse(localStorage.getItem("bubblePositions")) || {};
        if (!storedPositions[key]) {
          const randomPosition = Math.random() * (max - 2 * offset) + offset;
          storedPositions[key] = randomPosition;
          localStorage.setItem(
            "bubblePositions",
            JSON.stringify(storedPositions)
          );
        }
        return storedPositions[key];
      };

      // Ensure bubbles are placed within the canvas boundaries deterministically
      d.x = getOrSetPosition(`${d.name}-x`, width, d.size);
      d.y = getOrSetPosition(`${d.name}-y`, height, d.size);

      // Introduce subtle jitter for animation effects
      d.jitterX = Math.random() * 0.5 - 0.25;
      d.jitterY = Math.random() * 0.5 - 0.25;
    });

    // Force simulation.
    const simulation = d3
      .forceSimulation(data)
      .force(
        "collide",
        d3.forceCollide((d) => d.size + 5)
      )
      .on("tick", ticked);

    // Create groups for each bubble and its labels.
    const groups = svg
      .selectAll("g.bubble-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "bubble-group")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .call(
        d3
          .drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      )
      .on("click", (event, d) => {
        setSelectedBubble({
          x: d.x,
          y: d.y,
          data: d,
        });
        selectedBubbleRef.current = { x: d.x, y: d.y, data: d };
      });

    // Draw bubbles inside the group.
    groups
      .append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d, i) => `url(#bubble-gradient-${i})`)
      .attr("filter", "url(#bubble-glow)");

    // Add labels for company logo, name, and percentage change inside the group
    groups
      .append("g")
      .attr("class", "label")
      .each(function (d) {
        const labelGroup = d3.select(this);

        // Add the company logo
        labelGroup
          .append("image")
          .attr("xlink:href", d.logoUrl)
          .attr("width", d.size / 2) // Adjust size dynamically based on bubble size
          .attr("height", d.size / 2)
          .attr("x", -d.size / 4) // Center the logo
          .attr("y", -d.size / 2.1); // Position slightly above the center

        // Add the company name below the logo
        labelGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr("y", d.size / 4) // Position below the center
          .style("fill", "white")
          .style("font-size", `${Math.max(8, d.size / 6)}px`) // Dynamically scale font size
          .style("font-weight", "bold")
          .style("user-select", "none") // Prevent text selection
          .text(d.name);

        // Add the percentage change below the company name
        labelGroup
          .append("text")
          .attr("text-anchor", "middle")
          .attr("y", d.size / 2) // Position further below the name
          .style("fill", d.change > 0 ? "#00ff00" : "#ff5555") // Green for positive, red for negative
          .style("font-size", "12px")
          .style("user-select", "none") // Prevent text selection
          .text(`${d.change > 0 ? "+" : ""}${d.change.toFixed(2)}%`);
      });

    // Jitter effect with boundary constraints
    d3.timer((elapsed) => {
      data.forEach((d) => {
        d.x += d.jitterX * Math.sin(elapsed / 2000);
        d.y += d.jitterY * Math.cos(elapsed / 2000);

        // Constrain to bounds
        d.x = Math.max(d.size, Math.min(width - d.size, d.x));
        d.y = Math.max(d.size, Math.min(height - d.size, d.y));
      });
      simulation.alpha(0.1).restart();
    });

    function ticked() {
      groups.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      if (selectedBubbleRef.current) {
        const selected = data.find(
          (d) => d.name === selectedBubbleRef.current.data.name
        );
        if (selected) {
          selectedBubbleRef.current = {
            ...selectedBubbleRef.current,
            x: selected.x,
            y: selected.y,
          };
        }
      }
    }

    // Drag event handlers
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = Math.max(d.size, Math.min(width - d.size, event.x));
      d.fy = Math.max(d.size, Math.min(height - d.size, event.y));
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [data]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
  
    // Reset all circles to default appearance
    svg
      .selectAll("circle")
      .interrupt() // Stop any ongoing animations
      .attr("stroke", "none")
      .attr("stroke-width", 0);
  
    // Ensure highlightedStock is an array and has valid entries
    if (Array.isArray(highlightedStock) && highlightedStock.length > 0) {  
      svg.selectAll("circle").each(function (d) {
        // Match if the bubble's `d.name` is in the `highlightedStock` array
        const match = highlightedStock.find((stock) => stock.name === d.name);
  
        if (match) {  
          d3.select(this)
            .transition()
            .duration(300)
            .ease(d3.easeLinear)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1)
            .transition()
            .duration(500)
            .ease(d3.easeCubic)
            .attr("stroke-width", 6)
            .attr("stroke-opacity", 0.8)
            .transition()
            .duration(300)
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1);
        }
      });
    }
  }, [highlightedStock]);   

  return (
    <>
      <svg ref={svgRef}></svg>
      {selectedBubble && (
        <PopupGraph
          stockName={selectedBubble?.data?.name}
          suffix={selectedBubble?.data?.suffix}
          onClose={() => {
            setSelectedBubble(null);
            selectedBubbleRef.current = null; // Reset the reference
          }}
          x={selectedBubble?.x}
          y={selectedBubble?.y}
        />
      )}
    </>
  );
};

export default BubbleChart;
