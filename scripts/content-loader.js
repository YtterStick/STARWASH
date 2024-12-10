function fetchTotalCounts() {
    fetch('/api/branches/total-branches')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('total-branches').textContent = `Total Branches: ${data.total_branches}`;
            } else {
                console.error('Failed to fetch total branches');
            }
        })
        .catch(error => {
            console.error('Error fetching total branches:', error);
        });

    fetch('/api/branches/total-users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('total-users').textContent = `Total Users: ${data.total_users}`;
            } else {
                console.error('Failed to fetch total users');
            }
        })
        .catch(error => {
            console.error('Error fetching total users:', error);
        });
}
document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');
    const logoutBtn = document.getElementById("logout-btn");
    const role = sessionStorage.getItem("role");
    const userId = sessionStorage.getItem("userId");
    if (!userId || !role) {
        alert("Session expired. Please log in again.");
        window.location.href = "/";
        return;
    }
    function fetchTodayIncome() {
        fetch('/api/dashboard/today-income')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch today\'s income.');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const todayIncomeElement = document.getElementById('today-income');
                    if (todayIncomeElement) {
                        const todayIncome = parseFloat(data.today_income);
                        if (!isNaN(todayIncome)) {
                            todayIncomeElement.innerHTML = `&#8369;${todayIncome.toLocaleString()}`;
                        } else {
                            todayIncomeElement.innerHTML = `&#8369;0`;
                        }
                    }
                } else {
                    console.warn('Failed to fetch today\'s income:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching today\'s income:', error);
            });
    }

    function fetchTotalSales() {
        fetch('/api/dashboard-total-sales')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch total sales.');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const totalSalesElement = document.getElementById('today-sales');
                    if (totalSalesElement) {
                        const totalSales = parseInt(data.total_sales, 10);
                        totalSalesElement.innerHTML = `${totalSales.toLocaleString()}`;
                    }
                } else {
                    console.warn('Failed to fetch total sales:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching total sales:', error);
            });
    }


    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout";
        });
    }

    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    function loadContent(section) {
        const contentFile = `/pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                mainContent.innerHTML = data;
                setActiveLink(section);
                fetchTotalSales();
                fetchTodayIncome();
                if (section === 'reports') {
                    populateBranchSelectionForReports();

                }
                else if (section === 'dashboard') {
                    initializeDashboardChart();
                } else if (section === 'create-account') {
                    attachCreateAccountFormHandler();
                    populateBranchSelection();
                } else if (section === 'existing-account') {
                    fetchExistingAccounts();
                } else if (section === 'create-branch') {
                    populateAllBranches();
                    fetchTotalCounts();
                    attachCreateBranchFormHandler();
                    attachModalCloseHandler();
                    attachEditBranchFormHandler();
                } else if (section === 'sales-record') {
                    populateBranchSelection();
                    attachSalesRecordHandlers();
                } else if (section === 'inventory') {
                    loadInventorySection();
                } else if (section === 'audit-trail') {
                    loadAuditTrail();
                } else if (section === 'distribution-overview') {
                    initializeManageDistribution();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
            }
        });
    }
    function initializeManageDistribution() {
        const distributionOrdersTable = document.getElementById("distribution-orders-body");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const branchFilter = document.getElementById("branch-filter");
        const sortOptionSelect = document.getElementById("sort-option");
        const prevPage = document.getElementById("prev-page");
        const nextPage = document.getElementById("next-page");
        const currentPageSpan = document.getElementById("current-page");

        let currentPage = 1;
        let currentBranchId = null;

        // Map sort option values to backend column names
        const sortOptionMapping = {
            "date-created": "created_at",
            "date-paid": "paid_at",
        };

        // Fetch and populate branch filter options
        function populateBranchOptions() {
            fetch('/api/branches')
                .then(response => response.json())
                .then(data => {
                    branchFilter.innerHTML = ""; // Clear existing options
                    data.forEach((branch, index) => {
                        branchFilter.innerHTML += `<option value="${branch.id}">${branch.name}</option>`;
                        // Set the first branch as default
                        if (index === 0) {
                            currentBranchId = branch.id;
                        }
                    });
                    branchFilter.value = currentBranchId; // Set the default branch in the dropdown
                    fetchDistributionRecords(); // Automatically fetch records for the default branch
                })
                .catch(err => console.error('Error fetching branches:', err));
        }

        // Fetch unclaimed loads directly using branch information
        function fetchDistributionRecords() {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            const selectedBranchId = branchFilter.value || currentBranchId;
            const sortOption = sortOptionMapping[sortOptionSelect.value] || "created_at"; // Map to backend column

            if (!selectedBranchId) {
                distributionOrdersTable.innerHTML = "<tr><td colspan='3'>Please select a branch.</td></tr>";
                return;
            }

            let url = `/api/branches/unclaimed?branchId=${selectedBranchId}&sortOption=${sortOption}&page=${currentPage}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        distributionOrdersTable.innerHTML = "";
                        data.transactions.forEach(transaction => {
                            const row = document.createElement("tr");

                            row.innerHTML = `
                                <td>${transaction.customer_name}</td>
                                <td>${transaction.number_of_loads}</td>
                                <td>${new Date(transaction[sortOption]).toLocaleString()}</td>
                            `;

                            distributionOrdersTable.appendChild(row);
                        });

                        // Update pagination
                        currentPageSpan.textContent = currentPage;
                        prevPage.disabled = currentPage === 1;
                        nextPage.disabled = currentPage >= data.totalPages;
                    } else {
                        distributionOrdersTable.innerHTML = "<tr><td colspan='3'>No records found.</td></tr>";
                    }
                })
                .catch(err => console.error('Error fetching records:', err));
        }

        // Event listeners for filters
        branchFilter.addEventListener("change", () => {
            currentBranchId = branchFilter.value; // Update current branch ID
            currentPage = 1; // Reset to the first page
            fetchDistributionRecords();
        });

        startDateInput.addEventListener("change", fetchDistributionRecords);
        endDateInput.addEventListener("change", fetchDistributionRecords);
        sortOptionSelect.addEventListener("change", fetchDistributionRecords);

        prevPage.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                fetchDistributionRecords();
            }
        });

        nextPage.addEventListener("click", () => {
            currentPage++;
            fetchDistributionRecords();
        });

        // Initial setup
        populateBranchOptions();
    }




    function loadAuditTrail(page = 1) {
        const auditTrailTableBody = document.getElementById("audit-trail-table-body");
        const paginationContainer = document.getElementById("pagination-container");
        const recordsPerPage = 10; // Adjust as needed

        fetch(`/api/branches/audit-trails?page=${page}&limit=${recordsPerPage}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    const auditTrails = data.auditTrails;
                    const totalPages = data.totalPages;

                    // Clear previous content
                    auditTrailTableBody.innerHTML = "";
                    paginationContainer.innerHTML = "";

                    // Populate the table with audit trails
                    auditTrails.forEach((trail, index) => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${(page - 1) * recordsPerPage + index + 1}</td>
                            <td>${trail.username}</td>
                            <td>${trail.action_type}</td>
                            <td>${trail.entity_name} (ID: ${trail.entity_id || "N/A"})</td>
                            <td>${trail.action_details}</td>
                            <td>${trail.branch_id}</td>
                            <td>${new Date(trail.timestamp).toLocaleString()}</td>
                        `;
                        auditTrailTableBody.appendChild(row);
                    });

                    // Create pagination controls
                    if (page > 1) {
                        const prevButton = document.createElement("button");
                        prevButton.textContent = "Previous";
                        prevButton.addEventListener("click", () => loadAuditTrail(page - 1));
                        paginationContainer.appendChild(prevButton);
                    }

                    const pageNumber = document.createElement("span");
                    pageNumber.textContent = `Page ${page} of ${totalPages}`;
                    paginationContainer.appendChild(pageNumber);

                    if (page < totalPages) {
                        const nextButton = document.createElement("button");
                        nextButton.textContent = "Next";
                        nextButton.addEventListener("click", () => loadAuditTrail(page + 1));
                        paginationContainer.appendChild(nextButton);
                    }
                } else {
                    auditTrailTableBody.innerHTML = "<tr><td colspan='7'>No audit trails found.</td></tr>";
                    paginationContainer.innerHTML = "";
                }
            })
            .catch((error) => {
                console.error("Error loading audit trails:", error);
                auditTrailTableBody.innerHTML = "<tr><td colspan='7'>Error loading audit trails. Please try again.</td></tr>";
            });
    }

    function loadInventorySection() {
        const branchFilter = document.getElementById("branch-filter");
        const inventoryTableBody = document.getElementById("inventory-table-body");
        const addInventoryForm = document.getElementById("add-inventory-form");

        // Fetch branches and populate the branch filter dropdown
        fetch("/api/branches")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data:", data); // Logs data fetched from the API

                // Check if data is an array and contains branches
                if (Array.isArray(data) && data.length > 0) {
                    branchFilter.innerHTML = data.map(branch =>
                        `<option value="${branch.id}">${branch.name}</option>`
                    ).join(""); // Dynamically create <option> elements and join them

                    // Load inventory for the first branch
                    loadInventoryData(branchFilter.value);
                } else {
                    console.error("No branches data available.");
                }
            })
            .catch(error => {
                console.error("Error fetching branches:", error);
            });

        // Load inventory data for the selected branch
        branchFilter.addEventListener("change", () => {
            loadInventoryData(branchFilter.value);
        });

        function loadInventoryData(branchId) {
            fetch(`/api/inventory?branch_id=${branchId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        inventoryTableBody.innerHTML = data.inventory.map(item => `
                            <tr>
                                <td>${item.item}</td>
                                <td>${item.quantity}</td>
                                <td>${new Date(item.updated_at).toLocaleString()}</td>
                            </tr>
                        `).join("");
                    } else {
                        inventoryTableBody.innerHTML = "<tr><td colspan='3'>No inventory data available.</td></tr>";
                    }
                })
                .catch(error => console.error("Error loading inventory data:", error));
        }

        // Handle enabling/disabling quantity inputs based on checkboxes
        addInventoryForm.addEventListener("input", event => {
            if (event.target.type === "checkbox") {
                const quantityInput = event.target.closest(".checkbox-group").querySelector("input[type='number']");
                quantityInput.disabled = !event.target.checked;
                if (!event.target.checked) {
                    quantityInput.value = ""; // Clear the input when disabled
                }
            }
        });

        // Handle form submission
        addInventoryForm.addEventListener("submit", event => {
            event.preventDefault();
            const branchId = branchFilter.value;
            const formData = new FormData(addInventoryForm);
            const items = [];

            formData.getAll("item").forEach(item => {
                const quantity = formData.get(`quantity_${item.replace(" ", "_")}`);
                if (quantity) {
                    items.push({ item, quantity: parseInt(quantity, 10) });
                }
            });

            // Send inventory data to backend for processing
            fetch(`/api/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branch_id: branchId, items }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("Inventory updated successfully!");
                        loadInventoryData(branchId); // Refresh inventory data
                        addInventoryForm.reset();
                    } else {
                        alert("Failed to update inventory.");
                    }
                })
                .catch(error => console.error("Error updating inventory:", error));
        });

    }
    function populateAllBranches() {
        const branchesTableBody = document.getElementById("branches-table-body");

        fetch("/api/branches")
            .then((response) => response.json())
            .then((branches) => {
                console.log("Fetched branches:", branches);
                if (branches.length > 0) {
                    branchesTableBody.innerHTML = branches
                        .map(branch => `
                            <tr>
                                <td>${branch.name}</td>
                                <td>${branch.address || "N/A"}</td>
                                <td>${branch.user_count}</td>
                                <td>
                                    <button class="edit-btn" data-id="${branch.id}">Edit</button>
                                    <button class="delete-btn" data-id="${branch.id}">Delete</button>
                                </td>
                            </tr>
                        `)
                        .join("");

                    attachBranchActionHandlers();
                } else {
                    branchesTableBody.innerHTML = "<tr><td colspan='4'>No branches available.</td></tr>";
                }
            })
            .catch((error) => {
                console.error("Error fetching branches:", error);
                branchesTableBody.innerHTML = "<tr><td colspan='4'>An error occurred while loading branches.</td></tr>";
            });
    }


    function attachBranchActionHandlers() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", handleDeleteBranch);
        });

        document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const branchId = e.target.dataset.id;
                const row = e.target.closest("tr");
                const branchName = row.querySelector("td:nth-child(1)").textContent;
                const branchAddress = row.querySelector("td:nth-child(2)").textContent;

                document.getElementById("edit-branch-id").value = branchId;
                document.getElementById("edit-branch-name").value = branchName;
                document.getElementById("edit-branch-address").value = branchAddress;

                const modal = document.getElementById("editBranchModal");
                modal.style.display = "flex";
                setTimeout(() => {
                    modal.classList.add("show");
                }, 10);
            });
        });
    }

    function attachModalCloseHandler() {
        const modal = document.getElementById("editBranchModal");
        const closeBtn = modal.querySelector(".close-btn");

        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
            setTimeout(() => {
                modal.style.display = "none";
            }, 300); // Matches the animation duration
        });

        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.classList.remove("show");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
            }
        });
    }


    async function handleDeleteBranch(e) {
        const branchId = e.target.dataset.id;
        const branchName = e.target.closest("tr").querySelector("td").textContent;
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete the branch "${branchName}"? This action cannot be undone.`);

        if (confirmDelete) {
            try {
                const response = await fetch(`/api/branches/${branchId}`, { method: "DELETE" });
                if (!response.ok) throw new Error("Failed to delete the branch.");

                const data = await response.json();
                if (data.success) {
                    alert("Branch deleted successfully!");
                    populateAllBranches(); // Refresh the branch list
                } else {
                    alert("Failed to delete the branch. Please try again.");
                }
            } catch (error) {
                console.error("Error deleting branch:", error);
                alert("An error occurred while deleting the branch.");
            }
        }
    }

    function attachEditBranchFormHandler() {
        const editBranchForm = document.getElementById("edit-branch-form");

        editBranchForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const branchId = document.getElementById("edit-branch-id").value;
            const updatedName = document.getElementById("edit-branch-name").value;
            const updatedAddress = document.getElementById("edit-branch-address").value;

            fetch(`/api/branches/${branchId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: updatedName, address: updatedAddress }),
            })
                .then((response) => {
                    if (!response.ok) throw new Error("Failed to update branch.");
                    return response.json();
                })
                .then((data) => {
                    if (data.success) {
                        alert("Branch updated successfully!");
                        document.getElementById("editBranchModal").style.display = "none";
                        populateAllBranches(); // Refresh the table
                    } else {
                        alert("Failed to update the branch. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error updating branch:", error);
                    alert("An error occurred while updating the branch.");
                });
        });
    }
    function populateBranchSelectionForReports() {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");

        if (!branchFilter) return;

        fetch("/api/branches")
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch branches");
                return response.json();
            })
            .then((branches) => {
                branchFilter.innerHTML = "";
                branches.forEach((branch) => {
                    const option = document.createElement("option");
                    option.value = branch.id;
                    option.textContent = branch.name;
                    branchFilter.appendChild(option);
                });

                if (branches.length > 0) {
                    branchFilter.value = branches[0].id;
                    const currentYear = new Date().getFullYear();
                    startDateInput.value = `${currentYear}-01-01`;
                    endDateInput.value = `${currentYear}-12-31`;
                    loadChartData();
                    fetchTotals(); // Fetch totals when the page loads
                }

                branchFilter.addEventListener("change", () => {
                    loadChartData();
                    fetchTotals();
                }); // Update on branch change
                startDateInput.addEventListener("change", () => {
                    loadChartData();
                    fetchTotals();
                }); // Update on start date change
                endDateInput.addEventListener("change", () => {
                    loadChartData();
                    fetchTotals();
                }); // Update on end date change
            })
            .catch((error) => {
                console.error("Error populating branch selection for reports:", error);
                alert("An error occurred while loading branches.");
            });
    }
    function fetchTotals() {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");

        if (!branchFilter) return;

        const branchId = branchFilter.value;
        const startDate = startDateInput ? startDateInput.value : "";
        const endDate = endDateInput ? endDateInput.value : "";

        fetch(`/api/branches/report-totals?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch totals.");
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    // Update the DOM with formatted totals
                    document.getElementById("total-sales").textContent = `₱${data.total_sales.toLocaleString()}`;
                    document.getElementById("total-transactions").textContent = `${data.total_transactions.toLocaleString()}`;
                    document.getElementById("total-income").textContent = `₱${parseFloat(data.total_income).toLocaleString()}`;
                } else {
                    console.warn("No data available for totals.");
                    document.getElementById("total-sales").textContent = "0";
                    document.getElementById("total-transactions").textContent = "0";
                    document.getElementById("total-income").textContent = "₱0";
                }
            })
            .catch((error) => {
                console.error("Error fetching totals:", error);
            });
    }

    function loadChartData() {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");

        if (!branchFilter) {
            console.warn("Branch filter element not found.");
            return;
        }

        const branchId = branchFilter.value;
        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';

        console.log("Selected Branch ID:", branchId);
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

        if (!branchId) {
            console.warn("Branch ID is required for loading chart data.");
            return;
        }

        fetch(`/api/branches/reports?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch report data.");
                return response.json();
            })
            .then(data => {
                console.log("Report Data:", data);
                if (data.success && data.data.length > 0) {
                    updateReportChart(data.data);
                } else {
                    console.warn("No data available for the selected branch and date range.");
                    updateReportChart([]);
                }
            })
            .catch(error => {
                console.error("Error initializing report chart:", error);
            });
    }

    function fetchExistingAccounts() {
        const tableBody = document.querySelector("#accounts-table tbody");
        const paginationContainer = document.getElementById("pagination-container");
        const modal = document.getElementById("editAccountModal");
        const closeModalButton = document.querySelector(".close-btn");
        const recordsPerPage = 8;
        let currentPage = 1;

        if (!tableBody || !paginationContainer || !modal) return;

        function loadRecords(page = 1) {
            fetch(`/api/accounts?page=${page}&limit=${recordsPerPage}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch accounts: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    tableBody.innerHTML = "";

                    if (!data.accounts || data.accounts.length === 0) {
                        tableBody.innerHTML = "<tr><td colspan='4'>No accounts found.</td></tr>";
                        return;
                    }

                    data.accounts.forEach(account => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${account.username}</td>
                            <td>${account.role}</td>
                            <td>${account.branch_name || "N/A"}</td>
                            <td>
                                <button class="edit-btn" data-id="${account.id}">Edit</button>
                                <button class="delete-btn" data-id="${account.id}">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });

                    attachActionHandlers();
                    updatePagination(data.totalPages, page);
                })
                .catch(error => {
                    console.error("Error loading accounts:", error);
                    tableBody.innerHTML = "<tr><td colspan='4'>Error loading accounts. Please try again later.</td></tr>";
                });
        }

        function attachActionHandlers() {
            document.querySelectorAll(".edit-btn").forEach(button => {
                button.addEventListener("click", (e) => {
                    const accountId = e.target.dataset.id;

                    if (!accountId) {
                        console.error("Invalid account ID.");
                        return;
                    }

                    // Fetch account details
                    fetch(`/api/accounts/${accountId}`)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to fetch account details: ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (data.success && data.account) {
                                // Populate modal fields
                                document.getElementById("edit-account-id").value = data.account.id;
                                document.getElementById("edit-username").value = data.account.username;
                                document.getElementById("edit-role").value = data.account.role;

                                // Handle branch dropdown for Admins
                                const branchDropdown = document.getElementById("edit-branch");
                                if (data.account.role === "Admin") {
                                    branchDropdown.innerHTML = `<option value="">N/A</option>`;
                                    branchDropdown.disabled = true;
                                } else {
                                    branchDropdown.disabled = false;
                                    populateBranchDropdown(data.account.branch_id);
                                }

                                // Open modal
                                openModal();
                            } else {
                                console.error("Failed to fetch account data or account not found.");
                            }
                        })
                        .catch(error => console.error("Error fetching account details:", error));
                });
            });
        }


        function populateBranchDropdown(selectedBranchId) {
            fetch("/api/branches")
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch branches: ${response.status}`);
                    return response.json();
                })
                .then(branches => {
                    const branchSelect = document.getElementById("edit-branch");
                    branchSelect.innerHTML = "";

                    branches.forEach(branch => {
                        const option = document.createElement("option");
                        option.value = branch.id;
                        option.textContent = branch.name;
                        if (branch.id === selectedBranchId) option.selected = true;
                        branchSelect.appendChild(option);
                    });
                })
                .catch(error => console.error("Error loading branches:", error));
        }

        function openModal() {
            modal.style.display = "flex"; // Show modal
            modal.style.opacity = "1"; // Ensure visibility
            modal.style.visibility = "visible"; // Handle transitions
        }

        function closeModal() {
            modal.style.opacity = "0"; // Begin fade-out
            modal.style.visibility = "hidden"; // For smooth transition
            setTimeout(() => {
                modal.style.display = "none"; // Hide completely after transition
            }, 300); // Matches CSS transition time
        }

        closeModalButton.addEventListener("click", closeModal);

        window.addEventListener("click", (event) => {
            if (event.target === modal) closeModal();
        });

        document.getElementById("edit-account-form").addEventListener("submit", (e) => {
            e.preventDefault();

            const accountId = document.getElementById("edit-account-id").value;
            const username = document.getElementById("edit-username").value;
            const role = document.getElementById("edit-role").value;
            const branchId = document.getElementById("edit-branch").value;

            fetch(`/api/accounts/${accountId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, role, branch_id: branchId }),
            })
                .then(response => {
                    // Handle non-2xx HTTP responses
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || "Failed to update account");
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    // Display success message from backend or default message
                    alert(data.message || "Account updated successfully!");
                    loadRecords(); // Refresh the account records
                    closeModal(); // Close the modal after update
                })
                .catch(error => {
                    // Log and alert the error message
                    console.error("Error updating account:", error);
                    alert(error.message || "An unexpected error occurred.");
                });
        });


        function updatePagination(totalPages, currentPage) {
            paginationContainer.innerHTML = "";

            if (currentPage > 1) {
                const prevButton = document.createElement("button");
                prevButton.textContent = "Previous";
                prevButton.addEventListener("click", () => loadRecords(currentPage - 1));
                paginationContainer.appendChild(prevButton);
            }

            const pageInfo = document.createElement("span");
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            paginationContainer.appendChild(pageInfo);

            if (currentPage < totalPages) {
                const nextButton = document.createElement("button");
                nextButton.textContent = "Next";
                nextButton.addEventListener("click", () => loadRecords(currentPage + 1));
                paginationContainer.appendChild(nextButton);
            }
        }

        loadRecords(currentPage);
    }


    function attachCreateAccountFormHandler() {
        const form = document.getElementById('account-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                try {
                    const response = await fetch('/create-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (response.ok) {
                        alert('Account created successfully!');
                        e.target.reset();
                    } else {
                        const errorMessage = await response.text();
                        alert(`Failed to create account: ${errorMessage}`);
                    }
                } catch (error) {
                    alert('An unexpected error occurred. Please try again.');
                    console.error("Create Account Error:", error);
                }
            });
        }
    }
    function attachCreateBranchFormHandler() {
        const branchForm = document.getElementById('branch-form');
        if (branchForm) {
            branchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(branchForm);
                const data = Object.fromEntries(formData.entries());

                console.log("Form Data:", data);

                fetch('/api/branches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to create branch');
                        }
                        return response.json();
                    })
                    .then(data => {
                        alert('Branch created successfully!');
                        console.log("Branch created:", data);
                        branchForm.reset();
                    populateAllBranches();
                    })
                    .catch(error => {
                        console.error('Error creating branch:', error);
                        alert('An error occurred while creating the branch.');
                    });
            });
        }
    }

    function populateBranchSelection() {
        const branchSelects = document.querySelectorAll('#branch_id, #branch-filter');

        fetch('/api/branches')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch branches');
                return response.json();
            })
            .then(branches => {
                branchSelects.forEach(branchSelect => {
                    branchSelect.innerHTML = '';
                    branches.forEach(branch => {
                        const option = document.createElement('option');
                        option.value = branch.id;
                        option.textContent = branch.name;
                        branchSelect.appendChild(option);
                    });
                });
                loadFilteredSalesRecords();
            })
            .catch(error => {
                console.error('Error fetching branches:', error);
                alert('An error occurred while loading branches.');
            });
    }

    function loadFilteredSalesRecords(page = 1) {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const sortOption = document.getElementById("sort-option");
        const salesTableBody = document.querySelector(".sales-table tbody");
        const paginationContainer = document.querySelector(".pagination");

        // Set default dates for the current year
        const currentYear = new Date().getFullYear();
        const defaultStartDate = `${currentYear}-01-01`; // YYYY-MM-DD
        const defaultEndDate = `${currentYear}-12-31`; // YYYY-MM-DD

        // If the input fields are empty, set them to default values
        if (startDateInput && !startDateInput.value) {
            startDateInput.value = defaultStartDate;
        }
        if (endDateInput && !endDateInput.value) {
            endDateInput.value = defaultEndDate;
        }

        const branchId = branchFilter ? branchFilter.value : null;
        const startDate = startDateInput ? startDateInput.value : defaultStartDate;
        const endDate = endDateInput ? endDateInput.value : defaultEndDate;
        let sortBy = sortOption ? sortOption.value : "created_at";

        const validSortOptions = {
            "date-created": "created_at",
            "date-paid": "paid_at",
            "date-claimed": "claimed_at",
        };

        if (validSortOptions[sortBy]) {
            sortBy = validSortOptions[sortBy];
        } else {
            console.error("Invalid sort option:", sortBy);
            return;
        }

        if (!branchId) {
            console.error("Branch ID is required.");
            salesTableBody.innerHTML = "<tr><td colspan='8'>Please select a branch to load sales data.</td></tr>";
            return;
        }

        fetch(`/api/branches/sales-records?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}&sort_option=${sortBy}&page=${page}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success && data.sales.length > 0) {
                    salesTableBody.innerHTML = data.sales
                        .map((sale) => `
                            <tr>
                                <td>${sale.customer_name ?? "N/A"}</td>
                                <td>${sale.fabric_softener_count ?? "0"}</td>
                                <td>${sale.detergent_count ?? "0"}</td>
                                <td>${sale.number_of_loads ?? "0"}</td>
                                <td>${sale.total_cost !== null ? parseFloat(sale.total_cost).toLocaleString() : "N/A"}</td>
                                <td>${sale.payment_status ?? "N/A"}</td>
                                <td>${sale.claimed_status ?? "N/A"}</td>
                                <td>${sale[sortBy] ? new Date(sale[sortBy]).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "N/A"}</td> <!-- MM/DD/YYYY, HH:MM AM/PM -->
                            </tr>
                        `)
                        .join("");
                    updatePagination(data.totalPages, page);
                } else {
                    salesTableBody.innerHTML = "<tr><td colspan='8'>No sales data available for the selected filters.</td></tr>";
                    paginationContainer.innerHTML = "";
                }
            })
            .catch((error) => {
                console.error("Error fetching sales records:", error);
                salesTableBody.innerHTML = "<tr><td colspan='8'>An error occurred while loading sales data. Please try again later.</td></tr>";
            });
    }


    function updatePagination(totalPages, currentPage) {
        const paginationContainer = document.querySelector(".pagination");
        paginationContainer.innerHTML = "";

        if (currentPage > 1) {
            const prevButton = document.createElement("button");
            prevButton.textContent = "Previous";
            prevButton.addEventListener("click", () => loadFilteredSalesRecords(currentPage - 1));
            paginationContainer.appendChild(prevButton);
        }

        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageInfo);

        if (currentPage < totalPages) {
            const nextButton = document.createElement("button");
            nextButton.textContent = "Next";
            nextButton.addEventListener("click", () => loadFilteredSalesRecords(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }
    }

    function attachSalesRecordHandlers() {
        loadFilteredSalesRecords(); // Load the first page by default
        const branchFilter = document.getElementById("branch-filter");
        const sortOption = document.getElementById("sort-option");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");

        if (branchFilter) {
            branchFilter.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (sortOption) {
            sortOption.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (startDateInput) {
            startDateInput.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (endDateInput) {
            endDateInput.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    loadContent('dashboard');
});