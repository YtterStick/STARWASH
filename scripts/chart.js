function initializeDashboardChart() {
    const canvas = document.getElementById("incomeChart");

    if (canvas) {
        const ctx = canvas.getContext("2d");

        fetch("/api/dashboard-stats")
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch dashboard stats.");
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const stats = data.stats;
                    const months = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                    ];

                    // Prepare data for chart datasets
                    const incomes = stats.map(stat => stat.income);
                    const expectedIncomes = stats.map(stat => stat.expected_income);
                    const deductedAmounts = stats.map(stat => stat.deducted_amount);
                    const sales = stats.map(stat => stat.sales);

                    const chartData = {
                        labels: months,
                        datasets: [
                            {
                                label: "Income",
                                data: incomes,
                                backgroundColor: "rgba(75, 192, 192, 0.2)",
                                borderColor: "rgba(75, 192, 192, 1)",
                                borderWidth: 1,
                                yAxisID: 'y1',
                            },
                            {
                                label: "Expected Income",
                                data: expectedIncomes,
                                backgroundColor: "rgba(153, 102, 255, 0.2)",
                                borderColor: "rgba(153, 102, 255, 1)",
                                borderWidth: 1,
                                yAxisID: 'y1',
                            },
                            {
                                label: "Deducted Amount",
                                data: deductedAmounts,
                                backgroundColor: "rgba(255, 99, 132, 0.2)",
                                borderColor: "rgba(255, 99, 132, 1)",
                                borderWidth: 1,
                                yAxisID: 'y1',
                            },
                            {
                                label: "Sales (Number of Loads)",
                                data: sales,
                                backgroundColor: "rgba(255, 159, 64, 0.2)",
                                borderColor: "rgba(255, 159, 64, 1)",
                                borderWidth: 1,
                                yAxisID: 'y2',
                            },
                        ],
                    };

                    const options = {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y1: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Income & Deducted Amount (₱)',
                                    color: 'white'
                                },
                                ticks: {
                                    color: 'white',
                                },
                            },
                            y2: {
                                type: 'linear',
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'Sales (loads)',
                                    color: 'white'
                                },
                                ticks: {
                                    color: 'white',
                                },
                                grid: {
                                    drawOnChartArea: false,
                                },
                            },
                            x: {
                                ticks: { color: 'white' },
                            },
                        },
                        plugins: {
                            legend: {
                                labels: { color: 'white' },
                            },
                            tooltip: {
                                titleColor: "white",
                                bodyColor: "white",
                            },
                            background: {
                                color: "rgba(225, 225, 225, 1)",
                            },
                        },
                    };

                    new Chart(ctx, {
                        type: "bar",
                        data: chartData,
                        options: options,
                    });
                } else {
                    console.warn("No dashboard stats found.");
                }
            })
            .catch(error => console.error("Error initializing dashboard chart:", error));
    } else {
        console.error("Canvas element not found for chart");
    }
}