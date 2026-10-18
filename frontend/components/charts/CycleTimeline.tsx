"use client";

import React from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface CycleTimelineProps {
  lastPeriodStart: string;
  cycleLengthAvg: number;
}

export default function CycleTimeline({ lastPeriodStart, cycleLengthAvg }: CycleTimelineProps) {
  const startDate = new Date(lastPeriodStart);
  
  const generateCycleData = () => {
    const data = [];
    for (let day = 1; day <= cycleLengthAvg; day++) {
      let phase = "Follicular";
      let hormoneLevel = 20; // Baseline
      
      if (day <= 5) {
        phase = "Menstruation";
        hormoneLevel = 10 + day * 2;
      } else if (day > 5 && day <= 13) {
        phase = "Follicular";
        hormoneLevel = 20 + Math.pow(day - 5, 2) * 1.5;
      } else if (day === 14) {
        phase = "Ovulation";
        hormoneLevel = 100;
      } else if (day > 14 && day <= cycleLengthAvg - 5) {
        phase = "Luteal";
        hormoneLevel = 80 - Math.pow(day - 14, 1.5);
      } else {
        phase = "Late Luteal";
        hormoneLevel = Math.max(10, 40 - (day - (cycleLengthAvg - 5)) * 5);
      }

      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day - 1);
      
      data.push({
        day,
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        phase,
        hormoneLevel: Math.round(hormoneLevel),
      });
    }
    return data;
  };

  const data = generateCycleData();
  
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const normalizedCurrentDay = currentDay > cycleLengthAvg ? currentDay % cycleLengthAvg : currentDay;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-64 mt-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHormoneAnimated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity={0.85}/>
              <stop offset="60%" stopColor="#fb7185" stopOpacity={0.35}/>
              <stop offset="100%" stopColor="#fda4af" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="strokeHormone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#2D1B36', opacity: 0.6 }} minTickGap={30} />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: '1px solid rgba(244,114,182,0.6)', 
              boxShadow: '0 10px 35px rgba(244,114,182,0.25)', 
              backgroundColor: 'rgba(255,255,255,0.95)', 
              backdropFilter: 'blur(12px)',
              padding: '12px 16px'
            }}
            labelStyle={{ color: '#2D1B36', fontWeight: 'bold' }}
            itemStyle={{ color: '#ec4899' }}
            formatter={(value, name, props) => [props.payload.phase, 'Phase']}
          />
          <Area 
            type="monotone" 
            dataKey="hormoneLevel" 
            stroke="url(#strokeHormone)" 
            strokeWidth={3.5} 
            fillOpacity={1} 
            fill="url(#colorHormoneAnimated)" 
            isAnimationActive={true}
            animationDuration={2200}
            animationEasing="ease-out"
          />
          {normalizedCurrentDay > 0 && normalizedCurrentDay <= cycleLengthAvg && (
            <ReferenceLine 
              x={data[normalizedCurrentDay - 1]?.date} 
              stroke="#6366f1" 
              strokeWidth={2}
              strokeDasharray="3 3" 
              label={{ position: 'top', value: 'Today 📍', fill: '#6366f1', fontSize: 12, fontWeight: 'bold' }} 
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
