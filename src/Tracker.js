import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

const ZepboundTracker = () => {
  const [doses, setDoses] = useState(() => {
    const savedDoses = localStorage.getItem('zepboundDoses');
    return savedDoses ? JSON.parse(savedDoses) : [{ date: '', amount: '' }];
  });
  const [concentrationData, setConcentrationData] = useState([]);
  const [activeTab, setActiveTab] = useState('primary');
  
  const HALF_LIFE_DAYS = 5;
  const BIOAVAILABILITY = 0.8;
  const PEAK_DELAY_DAYS = 1;

  const addDose = () => {
    if (doses.length < 15) {
      const newDoses = [...doses, { date: '', amount: '' }];
      setDoses(newDoses);
      localStorage.setItem('zepboundDoses', JSON.stringify(newDoses));
    }
  };

  const removeDose = (index) => {
    const newDoses = doses.filter((_, i) => i !== index);
    const finalDoses = newDoses.length > 0 ? newDoses : [{ date: '', amount: '' }];
    setDoses(finalDoses);
    localStorage.setItem('zepboundDoses', JSON.stringify(finalDoses));
  };

  const handleDoseChange = (index, field, value) => {
    const newDoses = [...doses];
    newDoses[index] = { ...newDoses[index], [field]: value };
    setDoses(newDoses);
    localStorage.setItem('zepboundDoses', JSON.stringify(newDoses));
  };

  const calculateWeeklyAverages = (data) => {
    const weeklyData = [];
    for (let i = 0; i < data.length; i += 7) {
      const weekSlice = data.slice(i, i + 7);
      const avgConcentration = weekSlice.reduce((sum, d) => sum + d.concentration, 0) / weekSlice.length;
      weeklyData.push({
        week: `Week ${Math.floor(i/7) + 1}`,
        avgConcentration: parseFloat(avgConcentration.toFixed(2))
      });
    }
    return weeklyData;
  };

  const calculateConcentrations = () => {
    const validDoses = doses.filter(dose => dose.date && dose.amount);
    if (validDoses.length === 0) return;

    const sortedDoses = validDoses.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const startDate = new Date(sortedDoses[0].date);
    const endDate = new Date(sortedDoses[sortedDoses.length - 1].date);
    endDate.setDate(endDate.getDate() + 28);

    const dailyData = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let totalConcentration = 0;
      const doseContributions = {};
      
      sortedDoses.forEach((dose, index) => {
        const doseDate = new Date(dose.date);
        const peakDate = new Date(doseDate);
        peakDate.setDate(peakDate.getDate() + PEAK_DELAY_DAYS);
        
        if (doseDate <= currentDate) {
          const daysSincePeak = (currentDate - peakDate) / (1000 * 60 * 60 * 24);
          
          let contribution = 0;
          if (daysSincePeak >= 0) {
            const bioavailableDose = parseFloat(dose.amount) * BIOAVAILABILITY;
            contribution = bioavailableDose * Math.pow(0.5, daysSincePeak / HALF_LIFE_DAYS);
          } else {
            const rampUpFraction = (currentDate - doseDate) / (1000 * 60 * 60 * 24) / PEAK_DELAY_DAYS;
            const bioavailableDose = parseFloat(dose.amount) * BIOAVAILABILITY;
            contribution = bioavailableDose * rampUpFraction;
          }
          
          totalConcentration += contribution;
          doseContributions[`dose${index + 1}`] = parseFloat(contribution.toFixed(2));
        } else {
          doseContributions[`dose${index + 1}`] = 0;
        }
      });

      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        concentration: parseFloat(totalConcentration.toFixed(2)),
        ...doseContributions
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setConcentrationData(dailyData);
  };

  useEffect(() => {
    calculateConcentrations();
  }, [doses]);

  const getStackedColors = (count) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff00ff',
      '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffff00',
      '#800080', '#008080', '#808000', '#800000', '#008000'
    ];
    return colors.slice(0, count);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-4 mb-8">
          <div className="flex-grow bg-blue-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-2">Zepbound (Tirzepatide) Properties</h2>
            <ul className="space-y-1">
              <li>• Bioavailability: 80%</li>
              <li>• Time to Peak: 24 hours</li>
              <li>• Half-life: 5 days</li>
              <li>• Steady State: 4-5 weeks</li>
            </ul>
          </div>
        </div>

        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Enter Doses</h2>
          {doses.map((dose, index) => (
            <div key={index} className="flex mb-4 gap-4">
              <input
                type="date"
                value={dose.date}
                onChange={(e) => handleDoseChange(index, 'date', e.target.value)}
                className="flex-1 border p-2 rounded-lg"
              />
              <input
                type="number"
                placeholder="Dose (mg)"
                value={dose.amount}
                onChange={(e) => handleDoseChange(index, 'amount', e.target.value)}
                className="w-32 border p-2 rounded-lg"
              />
              <button
                onClick={() => removeDose(index)}
                className="px-4 py-2 bg-red-100 rounded-lg"
              >
                Remove
              </button>
            </div>
          ))}
          {doses.length < 15 && (
            <button
              onClick={addDose}
              className="mt-2 px-4 py-2 bg-blue-100 rounded-lg w-full"
            >
              Add Dose
            </button>
          )}
        </div>

        {concentrationData.length > 0 && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('primary')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Line Chart
                </button>
                <button
                  onClick={() => setActiveTab('area')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'area' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Area Chart
                </button>
                <button
                  onClick={() => setActiveTab('stacked')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'stacked' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Stacked Area
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Weekly Averages
                </button>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'primary' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Drug Concentration Over Time</h3>
                    <LineChart width={800} height={400} data={concentrationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="concentration" stroke="#8884d8" name="Concentration (mg)" />
                    </LineChart>
                  </div>
                )}

                {activeTab === 'area' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Drug Concentration Area Chart</h3>
                    <AreaChart width={800} height={400} data={concentrationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="concentration" stroke="#8884d8" fill="#8884d8" name="Concentration (mg)" />
                    </AreaChart>
                  </div>
                )}

                {activeTab === 'stacked' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Stacked Dose Contributions</h3>
                    <AreaChart width={800} height={400} data={concentrationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {doses.filter(dose => dose.date && dose.amount).map((_, index) => (
                        <Area
                          key={index}
                          type="monotone"
                          dataKey={`dose${index + 1}`}
                          stackId="1"
                          stroke={getStackedColors(doses.length)[index]}
                          fill={getStackedColors(doses.length)[index]}
                          name={`Dose ${index + 1}`}
                        />
                      ))}
                    </AreaChart>
                  </div>
                )}

                {activeTab === 'weekly' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Weekly Average Concentrations</h3>
                    <BarChart width={800} height={400} data={calculateWeeklyAverages(concentrationData)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgConcentration" fill="#82ca9d" name="Weekly Average (mg)" />
                    </BarChart>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Date</th>
                    <th className="text-right p-2 border-b">Concentration (mg)</th>
                  </tr>
                </thead>
                <tbody>
                  {concentrationData.map((data, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{data.date}</td>
                      <td className="text-right p-2">{data.concentration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZepboundTracker;
