// Equipment inventory, editing, and creation for equipment.html.

(async function () {
    const profile = await initPage();
    if (!profile) return;

    const canManageEquipment = profile.role === "admin" || profile.role === "staff";
    const listView = document.getElementById("list-view");
    const formView = document.getElementById("form-view");
    const tbody = document.getElementById("equipment-body");
    const mobileList = document.getElementById("mobile-equipment-list");
    const count = document.getElementById("equipment-count");
    const summary = document.getElementById("inventory-summary");
    const search = document.getElementById("equipment-search");
    const form = document.getElementById("equipment-form");
    const nameInput = document.getElementById("equipment-name");
    const codeInput = document.getElementById("equipment-code");
    const categoryInput = document.getElementById("equipment-category");
    const quantityInput = document.getElementById("equipment-quantity");
    const locationInput = document.getElementById("equipment-location");
    const conditionInput = document.getElementById("equipment-condition");
    const statusInput = document.getElementById("equipment-status");
    const saveButton = document.getElementById("save-equipment");
    const formError = document.getElementById("form-error");
    const confirmDialog = document.getElementById("confirm-dialog");
    const deleteDialog = document.getElementById("delete-dialog");
    const confirmDeleteButton = document.getElementById("confirm-delete");
    const successDialog = document.getElementById("success-dialog");

    const statusLabels = {
        available: "Available",
        in_use: "In use",
        under_repair: "Under repair",
        defective: "Defective"
    };
    const conditionLabels = {
        good: "Good",
        fair: "Fair",
        poor: "Poor"
    };

    let equipment = [];
    let editingId = null;
    let pendingSave = false;
    let saving = false;
    let deleting = false;
    let equipmentToDelete = null;

    document.getElementById("add-equipment").hidden = !canManageEquipment;
    document.getElementById("action-heading").hidden = !canManageEquipment;

    function setCellText(cell, text, className) {
        if (className) cell.className = className;
        cell.textContent = text;
        return cell;
    }

    function statusBadge(value) {
        const safeStatus = Object.prototype.hasOwnProperty.call(statusLabels, value) ? value : "unknown";
        const badge = createEl("span", "status-badge status-" + safeStatus);
        const dot = createEl("span", "status-dot");
        dot.setAttribute("aria-hidden", "true");
        badge.append(dot, document.createTextNode(statusLabels[value] || "Unknown"));
        return badge;
    }

    function conditionBadge(value) {
        const safeCondition = Object.prototype.hasOwnProperty.call(conditionLabels, value) ? value : "unknown";
        const badge = createEl("span", "status-badge condition-" + safeCondition);
        const dot = createEl("span", "status-dot");
        dot.setAttribute("aria-hidden", "true");
        badge.append(dot, document.createTextNode(conditionLabels[value] || "Unknown"));
        return badge;
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value + "T00:00:00");
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function addMobileDetail(card, label, value, valueClass) {
        const detail = createEl("div", "mobile-equipment-detail");
        const detailLabel = createEl("span", "mobile-detail-label");
        detailLabel.textContent = label;
        const detailValue = createEl("span", valueClass || "mobile-detail-value");
        detailValue.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
        detail.append(detailLabel, detailValue);
        card.appendChild(detail);
    }

    function addMobileStatusDetail(card, label, value, badgeFactory) {
        const detail = createEl("div", "mobile-equipment-detail");
        const detailLabel = createEl("span", "mobile-detail-label");
        detailLabel.textContent = label;
        detail.append(detailLabel, badgeFactory(value));
        card.appendChild(detail);
    }

    function createEquipmentActions(item) {
        const actions = createEl("div", "equipment-actions");
        const edit = createEl("button", "btn btn-small edit-button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.setAttribute("aria-label", "Edit " + item.name + ", " + item.equipment_code);
        edit.addEventListener("click", function () {
            openEditForm(item);
        });

        const remove = createEl("button", "btn btn-small btn-danger delete-button");
        remove.type = "button";
        remove.textContent = "Delete";
        remove.setAttribute("aria-label", "Delete " + item.name + ", " + item.equipment_code);
        remove.addEventListener("click", function () {
            requestDelete(item);
        });
        actions.append(edit, remove);
        return actions;
    }

    function setInventorySummary(visibleCount, totalCount) {
        const noun = totalCount === 1 ? "item" : "items";
        count.textContent = totalCount + " " + noun;
        summary.textContent = visibleCount === totalCount
            ? totalCount + (totalCount === 1 ? " item" : " items") + " in your inventory"
            : "Showing " + visibleCount + " of " + totalCount + " items";
    }

    function renderEquipment() {
        const query = search.value.trim().toLocaleLowerCase();
        const visibleEquipment = equipment.filter(function (item) {
            return [
                item.equipment_id,
                item.equipment_code,
                item.name,
                item.category,
                item.quantity,
                item.location,
                conditionLabels[item.condition_status] || item.condition_status,
                statusLabels[item.availability_status] || item.availability_status,
                item.date_added
            ].some(function (value) {
                return String(value === null || value === undefined ? "" : value)
                    .toLocaleLowerCase()
                    .includes(query);
            });
        });

        tbody.textContent = "";
        mobileList.textContent = "";
        setInventorySummary(visibleEquipment.length, equipment.length);

        if (!visibleEquipment.length) {
            const row = createEl("tr");
            const cell = createEl("td", "table-feedback");
            cell.colSpan = canManageEquipment ? 10 : 9;
            const emptyMessage = equipment.length
                ? "No equipment matches your search. Try a different name, ID, or status."
                : "No equipment records found. Add equipment to get started.";
            cell.textContent = emptyMessage;
            row.appendChild(cell);
            tbody.appendChild(row);
            const mobileEmptyMessage = createEl("p", "table-feedback");
            mobileEmptyMessage.textContent = emptyMessage;
            mobileList.appendChild(mobileEmptyMessage);
            return;
        }

        visibleEquipment.forEach(function (item) {
            const row = createEl("tr");
            row.append(
                setCellText(createEl("td"), item.equipment_id, "equipment-record-id"),
                setCellText(createEl("td"), item.equipment_code, "equipment-code-cell"),
                setCellText(createEl("td"), item.name, "equipment-name-cell"),
                setCellText(createEl("td"), item.category, ""),
                setCellText(createEl("td"), item.quantity, "equipment-quantity"),
                setCellText(createEl("td"), item.location, ""),
                createEl("td"),
                createEl("td"),
                setCellText(createEl("td"), formatDate(item.date_added), "equipment-date")
            );
            row.children[6].appendChild(conditionBadge(item.condition_status));
            row.children[7].appendChild(statusBadge(item.availability_status));

            const card = createEl("article", "mobile-equipment-card");
            const cardHeader = createEl("div", "mobile-card-heading");
            const cardName = createEl("h3");
            cardName.textContent = item.name;
            cardHeader.appendChild(cardName);
            card.appendChild(cardHeader);
            addMobileDetail(card, "Equipment ID", item.equipment_id, "mobile-card-id");
            addMobileDetail(card, "Equipment code", item.equipment_code, "mobile-card-id");
            addMobileDetail(card, "Category", item.category);
            addMobileDetail(card, "Quantity", item.quantity);
            addMobileDetail(card, "Location", item.location);
            addMobileStatusDetail(card, "Condition status", item.condition_status, conditionBadge);
            addMobileStatusDetail(card, "Availability status", item.availability_status, statusBadge);
            addMobileDetail(card, "Date added", formatDate(item.date_added));

            if (canManageEquipment) {
                const actionCell = createEl("td");
                actionCell.appendChild(createEquipmentActions(item));
                row.appendChild(actionCell);
                card.appendChild(createEquipmentActions(item));
            }

            tbody.appendChild(row);
            mobileList.appendChild(card);
        });
    }

    function setLoadingRow(message) {
        tbody.textContent = "";
        const row = createEl("tr");
        const cell = createEl("td", "table-feedback");
        cell.colSpan = canManageEquipment ? 10 : 9;
        cell.textContent = message;
        row.appendChild(cell);
        tbody.appendChild(row);
        mobileList.textContent = "";
        summary.textContent = message;
        count.textContent = "—";
    }

    async function loadEquipment() {
        setLoadingRow("Loading equipment...");
        const { data, error } = await db
            .from("equipment")
            .select("equipment_id, equipment_code, name, category, quantity, location, condition_status, availability_status, date_added")
            .order("equipment_id", { ascending: true });

        if (error) {
            showMessage("Could not load equipment. " + friendlyEquipmentError(error), "error");
            setLoadingRow("Equipment could not be loaded.");
            return false;
        }

        equipment = data || [];
        renderEquipment();
        return true;
    }

    function setFieldError(input, errorId, message) {
        const error = document.getElementById(errorId);
        error.textContent = message;
        error.hidden = !message;
        input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function clearFieldErrors() {
        setFieldError(nameInput, "name-error", "");
        setFieldError(codeInput, "code-error", "");
        setFieldError(categoryInput, "category-error", "");
        setFieldError(quantityInput, "quantity-error", "");
        setFieldError(locationInput, "location-error", "");
        setFieldError(conditionInput, "condition-error", "");
        setFieldError(statusInput, "status-error", "");
        formError.hidden = true;
        formError.textContent = "";
    }

    function openNewForm() {
        editingId = null;
        pendingSave = false;
        form.reset();
        quantityInput.value = "1";
        statusInput.value = "available";
        conditionInput.value = "good";
        clearFieldErrors();
        document.getElementById("form-title").textContent = "Add New Equipment";
        document.getElementById("form-description").textContent =
            "Enter the details below to add equipment to your inventory.";
        saveButton.textContent = "Save equipment";
        showForm();
    }

    function openEditForm(item) {
        editingId = item.equipment_id;
        pendingSave = false;
        form.reset();
        nameInput.value = item.name;
        codeInput.value = item.equipment_code;
        categoryInput.value = item.category;
        quantityInput.value = item.quantity;
        locationInput.value = item.location;
        conditionInput.value = item.condition_status;
        statusInput.value = item.availability_status;
        clearFieldErrors();
        document.getElementById("form-title").textContent = "Edit Equipment";
        document.getElementById("form-description").textContent =
            "Update the details for " + item.name + ".";
        saveButton.textContent = "Save changes";
        showForm();
    }

    function showForm() {
        listView.hidden = true;
        formView.hidden = false;
        clearMessage();
        document.getElementById("form-title").focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showList() {
        if (confirmDialog.open) confirmDialog.close();
        formView.hidden = true;
        listView.hidden = false;
        pendingSave = false;
        saving = false;
        saveButton.disabled = false;
        search.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
        loadEquipment();
    }

    function validateForm() {
        clearFieldErrors();
        const name = nameInput.value.trim();
        const code = codeInput.value.trim();
        const category = categoryInput.value.trim();
        const quantityText = quantityInput.value.trim();
        const location = locationInput.value.trim();
        const condition = conditionInput.value;
        const status = statusInput.value;
        let firstInvalid = null;

        if (!name) {
            setFieldError(nameInput, "name-error", "Enter an equipment name.");
            firstInvalid = nameInput;
        } else if (name.length > 120) {
            setFieldError(nameInput, "name-error", "The equipment name must be 120 characters or fewer.");
            firstInvalid = nameInput;
        }

        if (!code) {
            setFieldError(codeInput, "code-error", "Enter an equipment ID.");
            firstInvalid = firstInvalid || codeInput;
        } else if (code.length > 80) {
            setFieldError(codeInput, "code-error", "The equipment ID must be 80 characters or fewer.");
            firstInvalid = firstInvalid || codeInput;
        } else if (equipment.some(function (item) {
            return item.equipment_code.toLocaleLowerCase() === code.toLocaleLowerCase() &&
                item.equipment_id !== editingId;
        })) {
            setFieldError(codeInput, "code-error", "This equipment ID is already in use.");
            firstInvalid = firstInvalid || codeInput;
        }

        if (!category) {
            setFieldError(categoryInput, "category-error", "Enter an equipment category.");
            firstInvalid = firstInvalid || categoryInput;
        } else if (category.length > 100) {
            setFieldError(categoryInput, "category-error", "The category must be 100 characters or fewer.");
            firstInvalid = firstInvalid || categoryInput;
        }

        const quantity = Number(quantityText);
        if (!quantityText || !Number.isSafeInteger(quantity) || quantity < 0) {
            setFieldError(quantityInput, "quantity-error", "Enter a whole number of zero or more.");
            firstInvalid = firstInvalid || quantityInput;
        }

        if (!location) {
            setFieldError(locationInput, "location-error", "Enter an equipment location.");
            firstInvalid = firstInvalid || locationInput;
        } else if (location.length > 160) {
            setFieldError(locationInput, "location-error", "The location must be 160 characters or fewer.");
            firstInvalid = firstInvalid || locationInput;
        }

        if (!Object.prototype.hasOwnProperty.call(conditionLabels, condition)) {
            setFieldError(conditionInput, "condition-error", "Select a valid condition status.");
            firstInvalid = firstInvalid || conditionInput;
        }

        if (!Object.prototype.hasOwnProperty.call(statusLabels, status)) {
            setFieldError(statusInput, "status-error", "Select a valid equipment status.");
            firstInvalid = firstInvalid || statusInput;
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return null;
        }

        return {
            name: name,
            equipment_code: code,
            category: category,
            quantity: quantity,
            location: location,
            condition_status: condition,
            availability_status: status
        };
    }

    function friendlyEquipmentError(error) {
        const text = error && error.message ? error.message : "";
        if (/duplicate key|unique constraint/i.test(text)) {
            return "That equipment ID is already in use. Enter a different ID.";
        }
        if (/row-level security|permission denied|not allowed/i.test(text)) {
            return "Your account does not have permission to change equipment.";
        }
        if (/failed to fetch|network/i.test(text)) {
            return "Cannot reach the database. Check your internet connection and try again.";
        }
        return text || "An unexpected database error occurred. Try again.";
    }

    async function saveEquipment() {
        if (!pendingSave || saving) return;
        saving = true;
        saveButton.disabled = true;
        saveButton.textContent = editingId === null ? "Adding equipment..." : "Updating equipment...";
        document.getElementById("cancel-form").disabled = true;
        clearMessage();
        formError.hidden = true;

        const values = {
            name: nameInput.value.trim(),
            equipment_code: codeInput.value.trim(),
            category: categoryInput.value.trim(),
            quantity: Number(quantityInput.value),
            location: locationInput.value.trim(),
            condition_status: conditionInput.value,
            availability_status: statusInput.value
        };

        let error;
        let data;
        try {
            if (editingId === null) {
                const result = await db
                    .from("equipment")
                    .insert({
                        name: values.name,
                        equipment_code: values.equipment_code,
                        category: values.category,
                        quantity: values.quantity,
                        location: values.location,
                        condition_status: values.condition_status,
                        availability_status: values.availability_status,
                    })
                    .select("equipment_id, equipment_code, name, category, quantity, location, condition_status, availability_status, date_added")
                    .single();
                data = result.data;
                error = result.error;
            } else {
                const result = await db
                    .from("equipment")
                    .update({
                        name: values.name,
                        equipment_code: values.equipment_code,
                        category: values.category,
                        quantity: values.quantity,
                        location: values.location,
                        condition_status: values.condition_status,
                        availability_status: values.availability_status
                    })
                    .eq("equipment_id", editingId)
                    .select("equipment_id, equipment_code, name, category, quantity, location, condition_status, availability_status, date_added")
                    .maybeSingle();
                data = result.data;
                error = result.error;
            }
        } catch (unexpectedError) {
            error = unexpectedError;
        }

        if (error || !data) {
            saving = false;
            saveButton.disabled = false;
            saveButton.textContent = editingId === null ? "Save equipment" : "Save changes";
            document.getElementById("cancel-form").disabled = false;
            formError.textContent = error
                ? "Could not save equipment. " + friendlyEquipmentError(error)
                : "Could not save equipment. The database did not confirm the change; refresh and try again.";
            formError.hidden = false;
            formError.focus();
            if (confirmDialog.open) confirmDialog.close();
            pendingSave = false;
            return;
        }

        const wasEditing = editingId !== null;
        const updatedItemIndex = equipment.findIndex(function (item) {
            return item.equipment_id === data.equipment_id;
        });
        if (updatedItemIndex === -1) {
            equipment.push(data);
        } else {
            equipment[updatedItemIndex] = data;
        }
        pendingSave = false;
        saving = false;
        document.getElementById("cancel-form").disabled = false;
        if (confirmDialog.open) confirmDialog.close();
        document.getElementById("success-title").textContent = wasEditing ? "Update successful" : "Added successfully";
        document.getElementById("success-description").textContent = wasEditing
            ? "The equipment record has been updated."
            : "The equipment has been added to your inventory.";
        successDialog.showModal();
    }

    function requestDelete(item) {
        if (deleting) return;
        equipmentToDelete = item;
        document.getElementById("delete-description").textContent =
            "Delete " + item.name + " (" + item.equipment_code + ")? This action cannot be undone.";
        deleteDialog.showModal();
    }

    async function deleteEquipment() {
        if (!equipmentToDelete || deleting) return;

        const deletedEquipment = equipmentToDelete;
        deleting = true;
        confirmDeleteButton.disabled = true;
        confirmDeleteButton.textContent = "Deleting...";

        let result;
        try {
            result = await db
                .from("equipment")
                .delete()
                .eq("equipment_id", deletedEquipment.equipment_id)
                .select("equipment_id")
                .maybeSingle();
        } catch (error) {
            result = { error: error };
        }

        if (result.error || !result.data) {
            const errorText = result.error && result.error.message ? result.error.message : "";
            const message = /foreign key|violates foreign key|transactions_equipment_id_fkey/i.test(errorText)
                ? "This equipment cannot be deleted because it has transaction records."
                : result.error
                    ? "Could not delete equipment. " + friendlyEquipmentError(result.error)
                    : "Could not delete equipment. The database did not confirm the deletion.";
            deleting = false;
            confirmDeleteButton.disabled = false;
            confirmDeleteButton.textContent = "Delete equipment";
            if (deleteDialog.open) deleteDialog.close();
            equipmentToDelete = null;
            showMessage(message, "error");
            return;
        }

        deleting = false;
        confirmDeleteButton.disabled = false;
        confirmDeleteButton.textContent = "Delete equipment";
        if (deleteDialog.open) deleteDialog.close();
        equipmentToDelete = null;
        equipment = equipment.filter(function (item) {
            return item.equipment_id !== result.data.equipment_id;
        });
        renderEquipment();
        showMessage("Equipment deleted successfully.", "success");
        search.focus();
    }

    document.getElementById("add-equipment").addEventListener("click", openNewForm);
    document.getElementById("back-to-list").addEventListener("click", showList);
    document.getElementById("cancel-form").addEventListener("click", showList);
    document.getElementById("cancel-confirm").addEventListener("click", function () {
        if (confirmDialog.open) confirmDialog.close();
        pendingSave = false;
        document.getElementById("save-equipment").focus();
    });
    document.getElementById("approve-confirm").addEventListener("click", saveEquipment);
    document.getElementById("cancel-delete").addEventListener("click", function () {
        if (deleteDialog.open) deleteDialog.close();
        equipmentToDelete = null;
    });
    confirmDeleteButton.addEventListener("click", deleteEquipment);
    document.getElementById("dismiss-success").addEventListener("click", function () {
        successDialog.close();
    });
    successDialog.addEventListener("close", function () {
        showList();
    });
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (saving) return;
        const values = validateForm();
        if (!values) return;
        nameInput.value = values.name;
        codeInput.value = values.equipment_code;
        pendingSave = true;
        document.getElementById("confirm-description").textContent = editingId === null
            ? "Are you sure you want to add " + values.name + " (" + values.equipment_code + ") to the equipment list?"
            : "Are you sure you want to save your updates to " + values.name + " (" + values.equipment_code + ")?";
        confirmDialog.showModal();
    });
    search.addEventListener("input", renderEquipment);

    await loadEquipment();
})();
