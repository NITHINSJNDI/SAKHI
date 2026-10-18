"use client";

import React from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

interface SymptomRadarProps {
  logs: any[];
}

export default function SymptomRadar({ logs }: SymptomRadarProps) {
  const symptomCounts: Record<string, number> = {
    "Cramps": 0,
    "Headache": 0,
    "Bloating": 0,
    "Acne": 0,
    "Fatigue": 0,
    "Mood swings": 0
  };

  let totalLogs = logs.length;
  if (totalLogs === 0) totalLogs = 1;

  logs.forEach(log => {
    if (log.symptoms && Array.isArray(log.symptoms)) {
      log.symptoms.forEach((sym: string) => {
        if (symptomCounts[sym] !== undefined) {
          symptomCounts[sym] += 1;
        }
      });
    }
  });

  const data = Object.keys(symptomCounts).map(key => ({
    subject: key,
    A: Math.round((symptomCounts[key] / totalLogs) * 100),
    fullMark: 100,
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-64 mt-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#f472b6" strokeOpacity={0.2} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#2D1B36', fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
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
            formatter={(value) => [`${value}% of logged days`, 'Frequency']}
          />
          <Radar 
            name="Symptoms" 
            dataKey="A" 
            stroke="#ec4899" 
            strokeWidth={2.5} 
            fill="#f472b6" 
            fillOpacity={0.45} 
            isAnimationActive={true}
            animationDuration={2200}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
