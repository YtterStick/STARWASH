
document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');
    const userId = sessionStorage.getItem("userId");
    const logoutBtn = document.getElementById("logout-btn");
    const incomeElement = document.getElementById("today-income");
    const salesElement = document.getElementById('today-sales');

    function fetchTodayStats() {
        fetch("/api/sales-order/branch-stats")
            .then((response) => response.json())
            .then((data) => {
                const { totalIncome, totalSales } = data.stats;

                const incomeElement = document.getElementById("today-income");
                if (incomeElement) {
                    incomeElement.textContent = `₱${parseFloat(totalIncome).toFixed(2)}`;
                }

                const salesElement = document.getElementById("today-sales");
                if (salesElement) {
                    salesElement.textContent = `${parseInt(totalSales)}`;
                }
            })
            .catch((error) => {
                console.error("Error fetching today's stats:", error);
            });
    }

    function initializeTodaysTransactions() {
        const recordsTable = document.getElementById("records-table");
        const paginationContainer = document.getElementById("pagination-container");
        const recordsPerPage = 5; // Number of records per page
        let currentPage = 1;
    
        // Function to fetch and display records for the current page
        function loadRecords(page = 1) {
            fetch(`/api/sales-order/todays-transactions?page=${page}&limit=${recordsPerPage}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        const transactions = data.transactions;
                        const totalPages = data.totalPages;
    
                        // Clear previous table content
                        recordsTable.innerHTML = `
                            <table class="sales-record-table">
                                <thead>
                                    <tr>
                                        <th>Customer Name</th>
                                        <th>Loads</th>
                                        <th>Detergent</th>
                                        <th>Fabric Softener</th>
                                        <th>Payment Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="transactions-body"></tbody>
                            </table>
                        `;
    
                        const transactionsBody = document.getElementById("transactions-body");
    
                        transactions.forEach((transaction) => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${transaction.customer_name}</td>
                                <td>${transaction.number_of_loads}</td>
                                <td>${transaction.detergent_count}</td>
                                <td>${transaction.fabric_softener_count}</td>
                                <td class="${transaction.payment_status.toLowerCase()}">${transaction.payment_status}</td>
                                <td>
                                    <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                                    <button class="delete-btn" data-id="${transaction.id}" 
                                        ${transaction.payment_status !== 'Unpaid' || transaction.load_status !== 'Pending' ? 'disabled' : ''}>
                                        Delete
                                    </button>
                                </td>
                            `;
    
                            transactionsBody.appendChild(row);
    
                            // Add event listener for edit button
                            row.querySelector(".edit-btn").addEventListener("click", (e) => {
                                const orderId = e.target.dataset.id;
                                editTransaction(orderId); // Call edit functionality
                            });
    
                            // Add event listener for delete button
                            row.querySelector(".delete-btn").addEventListener("click", (e) => {
                                const orderId = e.target.dataset.id;
                                deleteTransaction(orderId);
                            });
                        });
    
                        // Update pagination buttons
                        updatePagination(totalPages, page);
                    } else {
                        recordsTable.innerHTML = "<p>No records for today.</p>";
                        paginationContainer.innerHTML = ""; // Clear pagination if no data
                    }
                })
                .catch((error) => {
                    console.error("Error fetching today's transactions:", error);
                    recordsTable.innerHTML = "<p>Error loading records. Please try again later.</p>";
                });
        }
    
        // Function to handle pagination (Previous & Next buttons)
        function updatePagination(totalPages, currentPage) {
            paginationContainer.innerHTML = ""; // Clear previous pagination buttons
    
            // Create Previous Button if not on the first page
            if (currentPage > 1) {
                const prevButton = document.createElement("button");
                prevButton.textContent = "Previous";
                prevButton.classList.add("prev");
                prevButton.addEventListener("click", () => {
                    loadRecords(currentPage - 1);
                });
                paginationContainer.appendChild(prevButton);
            }
    
            // Display page number
            const pageNumber = document.createElement("span");
            pageNumber.textContent = `Page ${currentPage} of ${totalPages}`;
            paginationContainer.appendChild(pageNumber);
    
            // Create Next Button if not on the last page
            if (currentPage < totalPages) {
                const nextButton = document.createElement("button");
                nextButton.textContent = "Next";
                nextButton.classList.add("next");
                nextButton.addEventListener("click", () => {
                    loadRecords(currentPage + 1);
                });
                paginationContainer.appendChild(nextButton);
            }
        }
    
        // Initial load of records
        loadRecords(currentPage);
    }
    
    // Function to handle delete transaction
    function deleteTransaction(orderId) {
        if (!orderId) {
            console.error("Invalid orderId for deletion");
            alert("Invalid transaction selected for deletion.");
            return;
        }
    
        fetch(`/api/sales-order/delete-transaction/${orderId}`, {
            method: "DELETE",
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to delete transaction.");
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    alert("Transaction deleted successfully.");
                    initializeTodaysTransactions(); // Refresh the table
                } else {
                    alert(data.message || "Unable to delete transaction.");
                }
            })
            .catch((err) => {
                console.error("Error deleting transaction:", err);
                alert("Error deleting transaction. Please try again later.");
            });
    }
    
    // Function to handle edit transaction
    function editTransaction(orderId) {
        alert(`Edit functionality is triggered for order ID: ${orderId}`);
        // Implement actual edit functionality here (e.g., open a modal with editable fields)
    }
    
    
    

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout";
        });
    }

    console.log("mainContent: ", mainContent);

    if (!mainContent) {
        console.log("main content element not fount");
    }

    if (!userId) {
        alert("Session expired. Please log in again.");
        window.location.href = "/"; // Redirect to login
        return;
    }


    // Dropdown functionality for navigation
    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    function loadContent(section) {
        const contentFile = `/staff_pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                console.log("Response status: ", response.status);
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                console.log("Data loaded successfully");
                mainContent.innerHTML = data;
                setActiveLink(section);
                fetchTodayStats();
                initializeTodaysTransactions();

                setInterval(fetchTodayStats, 60000);

                if (section === "create-sales-order") {
                    initializeCreateSalesOrder();
                } else if (section === "order-process") {
                    initializeSalesProcess();
                } else if (section === "manage-distribution") {
                    initializeManageDistribution();
                } else if (section === "view-sales-record") {
                    initializeViewSalesRecord();
                } else if (section === "load-status") {
                    initializeLoadStatus();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    // Set active class on navigation links
    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
                console.log("Activated link for section: ", activeSection);
            }
        });
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    // Initialize Create Sales Order functionality
    function initializeCreateSalesOrder() {
        const form = document.getElementById("sales-order-form");
        const serviceDropdown = document.getElementById("services");
        const detergentInput = document.getElementById("detergent-count");
        const softenerInput = document.getElementById("fabric-softener-count");

        // Disable inputs for "Dry" service
        serviceDropdown.addEventListener("change", () => {
            const selectedService = serviceDropdown.value;

            if (selectedService === "Dry") {
                detergentInput.value = 0;
                detergentInput.disabled = true;
                softenerInput.value = 0;
                softenerInput.disabled = true;
            } else {
                detergentInput.disabled = false;
                softenerInput.disabled = false;
            }
        });

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Attach userId to the request
            data.userId = sessionStorage.getItem("userId");

            // Ensure no undefined or null values for detergent and softener count
            data.detergentCount = data.detergentCount || 0; // Default to 0 if undefined or null
            data.fabricSoftenerCount = data.fabricSoftenerCount || 0; // Default to 0 if undefined or null

            console.log("Data to be sent:", data);

            fetch("/api/sales-order/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Error processing transaction.");
                    return res.json();
                })
                .then((result) => {
                    if (result.success) {
                        alert(result.message);

                        if (result.receipt) {
                            showPrintPopup(result.receipt);
                        }

                        form.reset();
                    } else {
                        alert("Error: " + result.message);
                    }
                })
                .catch((err) => console.error("Error processing transaction:", err));
        });
    }


    // Initialize Sales Process (Fetch Unpaid Transactions)
    function initializeSalesProcess() {
        const unpaidOrdersTable = document.getElementById("unpaid-orders-body");

        fetch(`/api/sales-order/unpaid?userId=${userId}`) // Include userId in the request
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch unpaid transactions.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    const transactions = data.transactions;

                    unpaidOrdersTable.innerHTML = "";

                    transactions.forEach((transaction) => {
                        const row = document.createElement("tr");

                        row.innerHTML = ` 
                                <td>${transaction.customer_name}</td>
                                <td>${transaction.services}</td>
                                <td>${transaction.number_of_loads}</td>
                                <td>${transaction.detergent_count}</td>
                                <td>${transaction.fabric_softener_count}</td>
                                <td>PHP ${transaction.total_cost}</td>
                                <td>
                                    <button class="process-btn" data-id="${transaction.id}">Mark as Paid</button>
                                </td>
                            `;

                        unpaidOrdersTable.appendChild(row);
                    });

                    const processButtons = document.querySelectorAll(".process-btn");
                    processButtons.forEach((button) => {
                        button.addEventListener("click", (e) => {
                            const orderId = e.target.getAttribute("data-id");
                            markAsPaid(orderId);
                        });
                    });
                }
            })
            .catch((err) => {
                console.error("Error fetching unpaid transactions:", err);
            });
    }

    // Mark transaction as Paid
    function markAsPaid(orderId) {
        fetch(`/api/sales-order/mark-paid/${orderId}`, {
            method: "POST",
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to mark order as paid.");
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    alert(data.message);

                    if (data.receipt) {
                        showPrintPopup(data.receipt);
                    }

                    initializeSalesProcess(); // Refresh the unpaid orders table
                } else {
                    alert("Failed to process the transaction.");
                }
            })
            .catch((err) => {
                console.error("Error marking order as paid:", err);
                alert("Error marking order as paid.");
            });
    }

    // Manage Distribution (Show Paid Transactions)
    function initializeManageDistribution() {
        const distributionOrdersTable = document.getElementById("distribution-orders-body");

        fetch(`/api/sales-order/paid?userId=${userId}`) // Include userId in the request
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    const transactions = data.transactions;

                    distributionOrdersTable.innerHTML = "";

                    transactions.forEach((transaction) => {
                        const row = document.createElement("tr");

                        const formattedDate = transaction.paid_at
                            ? new Date(transaction.paid_at).toLocaleString("en-US", {
                                dateStyle: "short",
                                timeStyle: "short",
                            })
                            : "N/A";

                        const claimButton = transaction.load_status === "Completed" && transaction.payment_status === "Paid"
                            ? `<button class="mark-claimed-btn" data-id="${transaction.id}">Mark as Claimed</button>`
                            : `<button class="mark-claimed-btn" disabled>Cannot Claim</button>`;

                        row.innerHTML = `
                            <td>${transaction.customer_name}</td>
                            <td>${transaction.number_of_loads}</td>
                            <td>${formattedDate}</td>
                            <td>${claimButton}</td>
                        `;

                        distributionOrdersTable.appendChild(row);

                        // Add event listener to "Mark as Claimed" buttons
                        const claimButtonElement = row.querySelector(".mark-claimed-btn");
                        if (claimButtonElement && !claimButtonElement.disabled) {
                            claimButtonElement.addEventListener("click", (e) => {
                                const orderId = e.target.dataset.id;
                                markAsClaimed(orderId, e.target.closest("tr"));
                            });
                        }
                    });
                }
            })
            .catch((err) => {
                console.error("Error fetching transactions:", err);
            });
    }


    function markAsClaimed(orderId, rowElement) {
        fetch(`/api/sales-order/mark-claimed/${orderId}`, {
            method: "POST",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert(data.message);
                    if (rowElement) rowElement.remove(); // Remove the row after marking as claimed
                } else {
                    alert("Failed to mark as claimed.");
                }
            })
            .catch((err) => {
                console.error("Error marking as claimed:", err);
                alert("Error marking as claimed.");
            });
    }
    function initializeViewSalesRecord() {
        const recordsBody = document.getElementById("sales-records-body");
        const searchBar = document.getElementById("search-bar");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const prevPage = document.getElementById("prev-page");
        const nextPage = document.getElementById("next-page");
        const currentPageSpan = document.getElementById("current-page");
        const dateFilterDropdown = document.getElementById("date-filter-dropdown");

        let currentPage = 1;
        let selectedDateField = "created_at"; // Default to "created_at" field

        // Fetch records based on selected filters
        function fetchRecords() {
            const search = searchBar.value.trim();
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            fetch(`/api/sales-order/sales-records?page=${currentPage}&search=${search}&startDate=${startDate}&endDate=${endDate}&selectedDateField=${selectedDateField}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        recordsBody.innerHTML = "";
                        data.records.forEach((record) => {
                            const row = document.createElement("tr");

                            // Format the dynamically populated date
                            const formattedDateTime = record.formatted_date_time || 'N/A';

                            row.innerHTML = `
                            <td>${record.customer_name}</td>
                            <td>${record.number_of_loads}</td>
                            <td>${record.services}</td>
                            <td>${record.detergent_count || 0}</td>
                            <td>${record.fabric_softener_count || 0}</td>
                            <td>PHP ${record.total_cost}</td>
                            <td class="${record.payment_status === "Paid" ? "paid" : "unpaid"}">${record.payment_status}</td>
                            <td class="${record.claimed_status === "Claimed" ? "claimed" : "unclaimed"}">${record.claimed_status}</td>
                            <td>${formattedDateTime}</td> <!-- Dynamically formatted Date & Time -->
                        `;
                            recordsBody.appendChild(row);
                        });

                        currentPageSpan.textContent = currentPage;
                        prevPage.disabled = currentPage === 1;
                        nextPage.disabled = currentPage >= data.totalPages;
                    }
                })
                .catch((err) => console.error("Error fetching sales records:", err));
        }

        // Event listeners for filters
        searchBar.addEventListener("input", () => {
            currentPage = 1;  // Reset to first page on search input change
            fetchRecords();
        });

        startDateInput.addEventListener("change", fetchRecords);
        endDateInput.addEventListener("change", fetchRecords);

        prevPage.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                fetchRecords();
            }
        });

        nextPage.addEventListener("click", () => {
            currentPage++;
            fetchRecords();
        });

        // Date filter dropdown change event
        dateFilterDropdown.addEventListener("change", (e) => {
            selectedDateField = e.target.value; // Set selected date field for filtering
            fetchRecords();
        });

        // Initial fetch when the page loads
        fetchRecords();
    }
    // Load Status Section
    function initializeLoadStatus() {
        const loadStatusTableBody = document.getElementById("load-status-table-body");

        if (!loadStatusTableBody) {
            console.error("Load Status table body element not found.");
            return;
        }

        fetch("/api/sales-order/load-status")
            .then((response) => response.json())
            .then((data) => {
                console.log("Load Status API response:", data);

                if (data.success && Array.isArray(data.loadStatus)) {
                    loadStatusTableBody.innerHTML = ""; // Clear previous rows

                    // Filter and display only Pending and Ongoing loads
                    const filteredLoads = data.loadStatus.filter((load) => load.load_status !== "Completed");

                    if (filteredLoads.length === 0) {
                        loadStatusTableBody.innerHTML = `<tr><td colspan="5">No pending or ongoing loads.</td></tr>`;
                        return;
                    }

                    filteredLoads.forEach((load) => {
                        const row = document.createElement("tr");

                        row.innerHTML = `
                        <td>${load.customer_name}</td>
                        <td>${load.number_of_loads}</td>
                        <td>${new Date(load.created_at).toLocaleString()}</td>
                        <td>
                            <span class="${load.load_status.toLowerCase()}-status">${load.load_status}</span>
                        </td>
                        <td>
                            <button class="status-btn ${load.load_status.toLowerCase()}" 
                                    data-id="${load.id}" 
                                    data-status="${load.load_status}">
                                ${load.load_status === "Pending" ? "Process" : "Complete"}
                            </button>
                        </td>
                    `;

                        loadStatusTableBody.appendChild(row);
                    });

                    // Add event listeners for buttons
                    document.querySelectorAll(".status-btn").forEach((button) => {
                        button.addEventListener("click", (e) => {
                            const orderId = e.target.dataset.id;
                            const currentStatus = e.target.dataset.status;

                            // Determine next status
                            const newStatus = currentStatus === "Pending" ? "Ongoing" : "Completed";

                            updateLoadStatus(orderId, newStatus);
                        });
                    });
                } else {
                    loadStatusTableBody.innerHTML = `<tr><td colspan="5">No load status records found.</td></tr>`;
                }
            })
            .catch((error) => {
                console.error("Error fetching load statuses:", error);
                loadStatusTableBody.innerHTML = `<tr><td colspan="5">Error loading load statuses.</td></tr>`;
            });
    }

    // Update Load Status
    function updateLoadStatus(orderId, newStatus) {
        fetch(`/api/sales-order/update-load-status/${orderId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ load_status: newStatus }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    alert("Load status updated successfully!");
                    initializeLoadStatus(); // Refresh the load status table
                } else {
                    alert("Failed to update load status.");
                }
            })
            .catch((err) => {
                console.error("Error updating load status:", err);
                alert("Error updating load status.");
            });
    }


    // Show Print Popup for Receipt
    function showPrintPopup(receiptUrl) {
        const popup = document.getElementById("print-popup");
        const iframe = document.getElementById("receipt-iframe");
        const printButton = document.getElementById("print-button");
        const closeButton = document.getElementById("close-popup");

        iframe.src = receiptUrl;
        popup.style.display = "flex";

        printButton.onclick = () => {
            iframe.contentWindow.print();
        };

        closeButton.onclick = () => {
            popup.style.display = "none";
        };
    }


    loadContent("dashboard"); // Load default section on start
});