let reportChartInstance; // Global variable to track the chart instance

function updateReportChart(data) {
    const canvas = document.getElementById("reportChart");
    if (!canvas) {
        console.error("Canvas element for report chart not found.");
        return;
    }
    const ctx = canvas.getContext("2d");

    // Prepare the data for the chart
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const chartData = Array(12).fill({ income: 0, expected_income: 0, deducted_amount: 0, sales: 0 });

    data.forEach(entry => {
        const monthIndex = entry.month - 1;
        chartData[monthIndex] = {
            income: parseFloat(entry.total_income) || 0,
            expected_income: parseFloat(entry.expected_income) || 0,
            deducted_amount: parseFloat(entry.deducted_amount) || 0,
            sales: parseInt(entry.total_sales, 10) || 0,
        };
    });

    const incomes = chartData.map(stat => stat.income);
    const expectedIncomes = chartData.map(stat => stat.expected_income);
    const deductedAmounts = chartData.map(stat => stat.deducted_amount);
    const sales = chartData.map(stat => stat.sales);

    // If chart instance exists, update it
    if (reportChartInstance) {
        reportChartInstance.data.labels = months;
        reportChartInstance.data.datasets[0].data = incomes;
        reportChartInstance.data.datasets[1].data = expectedIncomes;
        reportChartInstance.data.datasets[2].data = deductedAmounts;
        reportChartInstance.data.datasets[3].data = sales;
        reportChartInstance.update(); // Update the chart with new data
        return;
    }

    // Create a new chart instance
    const config = {
        type: "bar",
        data: {
            labels: months,
            datasets: [
                {
                    label: "Income",
                    data: incomes,
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                    yAxisID: "y1",
                },
                {
                    label: "Expected Income",
                    data: expectedIncomes,
                    backgroundColor: "rgba(153, 102, 255, 0.2)",
                    borderColor: "rgba(153, 102, 255, 1)",
                    borderWidth: 1,
                    yAxisID: "y1",
                },
                {
                    label: "Deducted Amount",
                    data: deductedAmounts,
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                    yAxisID: "y1",
                },
                {
                    label: "Sales (Number of Loads)",
                    data: sales,
                    backgroundColor: "rgba(255, 159, 64, 0.2)",
                    borderColor: "rgba(255, 159, 64, 1)",
                    borderWidth: 1,
                    yAxisID: "y2",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3, 
            scales: {
                y1: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: "Income & Deducted Amount (₱)",
                        color: "white",
                    },
                    ticks: {
                        color: "white",
                    },
                },
                y2: {
                    type: "linear",
                    position: "right",
                    title: {
                        display: true,
                        text: "Sales (loads)",
                        color: "white",
                    },
                    ticks: {
                        color: "white",
                    },
                    grid: {
                        drawOnChartArea: false, // Disable grid lines for y2
                    },
                },
                x: {
                    ticks: {
                        color: "white",
                    },
                },
            },
            plugins: {
                legend: {
                    labels: {
                        color: "white",
                    },
                },
                tooltip: {
                    titleColor: "white",
                    bodyColor: "white",
                },
            },
        },
    };

    // Create a new chart
    reportChartInstance = new Chart(ctx, config);
}
