(function () {
  const $ = (id) => document.getElementById(id);
  const state = { leads: [], orders: [], inventory: [] };
  const money = (paise) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format((Number(paise) || 0) / 100);
  const dateLabel = (value) => value ? String(value).slice(0, 10) : "—";
  const escText = (value) => value == null || value === "" ? "—" : String(value);

  function message(text, kind) {
    const box = $("global-message");
    box.textContent = text || "";
    box.className = "global-message" + (kind ? " " + kind : "");
  }
  async function api(path, options) {
    const response = await fetch("/api/admin/" + path, Object.assign({
      credentials: "same-origin", cache: "no-store",
      headers: { "accept": "application/json" }
    }, options || {}));
    let result = {};
    try { result = await response.json(); } catch {}
    if (response.status === 401) { window.location.replace("/admin"); throw new Error("Your session expired. Please sign in again."); }
    if (!response.ok) throw new Error(result.error || "Request failed. Please try again.");
    return result;
  }
  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = escText(value);
    row.appendChild(cell);
    return cell;
  }
  function fillLeadOptions() {
    const select = $("order-lead");
    const previous = select.value;
    select.replaceChildren();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = state.leads.length ? "Choose customer" : "Add an enquiry first";
    select.appendChild(first);
    state.leads.forEach((lead) => {
      const option = document.createElement("option");
      option.value = String(lead.id);
      option.textContent = lead.customer_name + " · " + lead.phone;
      select.appendChild(option);
    });
    if (previous) select.value = previous;
  }
  function openLeadEditor(lead) {
    const dialog = document.createElement("dialog");
    dialog.className = "lead-editor-dialog";
    const title = document.createElement("h2"); title.textContent = "Edit enquiry";
    const intro = document.createElement("p"); intro.className = "section-desc"; intro.textContent = "Update this customer's saved details.";
    const form = document.createElement("form"); form.className = "lead-editor-form";
    const field = (labelText, name, value, type="text") => {
      const label=document.createElement("label"); label.textContent=labelText;
      const input=document.createElement("input"); input.name=name; input.type=type; input.value=value||"";
      if(name==="customer_name"){input.maxLength=120;input.required=true;}
      if(name==="phone"){input.maxLength=20;input.required=true;input.inputMode="tel";}
      if(name==="follow_up_at") input.value=value?String(value).slice(0,10):"";
      label.appendChild(input); form.appendChild(label); return input;
    };
    field("Customer name","customer_name",lead.customer_name);
    field("Phone number","phone",lead.phone,"tel");
    field("Interested in","product_interest",lead.product_interest);
    field("Source","source",lead.source);
    field("Follow-up date","follow_up_at",lead.follow_up_at,"date");
    const noteLabel=document.createElement("label");noteLabel.className="wide-field";noteLabel.textContent="Notes";
    const notes=document.createElement("textarea");notes.name="notes";notes.rows=3;notes.maxLength=2000;notes.value=lead.notes||"";noteLabel.appendChild(notes);form.appendChild(noteLabel);
    const actions=document.createElement("div");actions.className="form-actions wide-field";
    const save=document.createElement("button");save.className="primary-button";save.type="submit";save.textContent="Save changes";
    const cancel=document.createElement("button");cancel.className="secondary-button";cancel.type="button";cancel.textContent="Cancel";cancel.addEventListener("click",()=>dialog.close());
    actions.append(save,cancel);form.appendChild(actions);dialog.append(title,intro,form);document.body.appendChild(dialog);
    dialog.addEventListener("close",()=>dialog.remove(),{once:true});
    form.addEventListener("submit",async(event)=>{
      event.preventDefault();save.disabled=true;
      const data=Object.fromEntries(new FormData(form).entries());
      if(data.phone.trim().length<7){message("Enter a valid customer phone number.","error");save.disabled=false;return;}
      try {
        await api("leads/"+lead.id,{method:"PATCH",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(data)});
        await loadLeads();message("Enquiry details updated successfully.","success");dialog.close();
      } catch(error){message(error.message,"error");save.disabled=false;}
    });
    dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close();});
    dialog.showModal();
  }
  async function deleteLead(lead, button) {
    const hasOrder=state.orders.some(order=>Number(order.lead_id)===Number(lead.id));
    const warning=hasOrder?"This customer has an order linked to the enquiry. The system will protect the order history and may refuse deletion.":"This permanently deletes the saved enquiry.";
    if(!window.confirm("Delete enquiry for "+lead.customer_name+"?\n\n"+warning+"\n\nThis cannot be undone."))return;
    button.disabled=true;
    try{await api("leads/"+lead.id,{method:"DELETE"});await loadLeads();message("Enquiry deleted.","success");}
    catch(error){message(error.message,"error");button.disabled=false;}
  }
  function renderLeads() {
    const body = $("leads-table");
    body.replaceChildren();
    if (!state.leads.length) {
      const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 6; cell.textContent = "No enquiries yet. Use the form above to add your first customer.";
    }
    state.leads.forEach((lead) => {
      const row = body.insertRow();
      addCell(row, lead.customer_name + "\n" + lead.phone);
      addCell(row, lead.product_interest);
      addCell(row, lead.source);
      const cell = row.insertCell();
      const select = document.createElement("select");
      select.className = "status-select";
      [["new","New"],["contacted","Contacted"],["interested","Interested"],["order_confirmed","Order confirmed"],["follow_up","Follow up"],["not_interested","Not interested"]].forEach(([value,label]) => {
        const option = document.createElement("option"); option.value = value; option.textContent = label; select.appendChild(option);
      });
      select.value = lead.status;
      select.addEventListener("change", async () => {
        const previous=lead.status;select.disabled = true;
        try { await api("leads/" + lead.id, { method:"PATCH", headers:{"content-type":"application/json","accept":"application/json"}, body:JSON.stringify({status:select.value}) }); lead.status=select.value; message("Enquiry status updated.","success"); }
        catch (error) { select.value=previous; message(error.message,"error"); }
        finally { select.disabled=false; }
      });
      cell.appendChild(select);
      addCell(row, dateLabel(lead.follow_up_at));
      const actions=row.insertCell();actions.className="row-actions";
      const edit=document.createElement("button");edit.type="button";edit.className="secondary-button compact-button";edit.textContent="Edit";edit.addEventListener("click",()=>openLeadEditor(lead));
      const del=document.createElement("button");del.type="button";del.className="danger-button compact-button";del.textContent="Delete";del.addEventListener("click",()=>deleteLead(lead,del));
      actions.append(edit,del);
    });
    $("metric-leads").textContent = state.leads.length;
    fillLeadOptions();
  }
  function statusPicker(options, selected, onChange) {
    const select=document.createElement("select"); select.className="status-select";
    options.forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);});
    select.value=selected; select.addEventListener("change",()=>onChange(select)); return select;
  }
  function renderOrders() {
    const body = $("orders-table"); body.replaceChildren();
    if (!state.orders.length) { const row=body.insertRow(); const cell=row.insertCell(); cell.colSpan=6; cell.textContent="No orders recorded yet."; }
    state.orders.forEach((order) => {
      const row=body.insertRow();
      addCell(row, "#" + order.id + "\n" + dateLabel(order.created_at));
      addCell(row, (order.customer_name || "Unknown customer") + "\n" + (order.phone || ""));
      addCell(row, (order.pack_size_g===1000 ? "1 kg" : order.pack_size_g+" g") + " × " + order.quantity);
      addCell(row, money(order.total_paise));
      const paymentCell=row.insertCell();
      const paymentLabel=document.createElement("small"); paymentLabel.className="table-subtext"; paymentLabel.textContent=order.payment_method || "—"; paymentCell.appendChild(paymentLabel);
      paymentCell.appendChild(statusPicker([["pending","Pending"],["partially_paid","Partially paid"],["paid","Paid"],["refunded","Refunded"]],order.payment_status||"pending",async(select)=>{
        const previous=order.payment_status||"pending";select.disabled=true;
        try{await api("orders/"+order.id,{method:"PATCH",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({payment_status:select.value})});order.payment_status=select.value;message("Payment status updated.","success");}
        catch(error){select.value=previous;message(error.message,"error");}
        finally{select.disabled=false;}
      }));
      const statusCell=row.insertCell();
      statusCell.appendChild(statusPicker([["confirmed","Confirmed"],["packed","Packed"],["dispatched","Dispatched"],["delivered","Delivered"]],order.order_status||"confirmed",async(select)=>{
        const previous=order.order_status||"confirmed";select.disabled=true;
        try{await api("orders/"+order.id,{method:"PATCH",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({order_status:select.value})});order.order_status=select.value;message("Order status updated.","success");}
        catch(error){select.value=previous;message(error.message,"error");}
        finally{select.disabled=false;}
      }));
      const actionsCell=row.insertCell();
      const deleteButton=document.createElement("button");deleteButton.type="button";deleteButton.className="danger-button";deleteButton.textContent="Delete";
      deleteButton.setAttribute("aria-label","Delete order #"+order.id);
      if((order.payment_status||"pending")!=="pending"||(order.order_status||"confirmed")!=="confirmed"){deleteButton.disabled=true;deleteButton.title="Only confirmed, unshipped orders with pending payment can be deleted.";}
      deleteButton.addEventListener("click",async()=>{
        if(!window.confirm("Delete order #"+order.id+"? This cannot be undone. Stock will be restored if this order is eligible."))return;
        deleteButton.disabled=true;
        try{await api("orders/"+order.id,{method:"DELETE",headers:{"accept":"application/json"}});
          state.orders=state.orders.filter(item=>item.id!==order.id);
          const stock=state.inventory.find(item=>item.pack_size_g===order.pack_size_g);
          if(stock)stock.stock_qty+=order.quantity;
          renderOrders();renderInventory();message("Order deleted and stock restored.","success");
        }catch(error){message(error.message,"error");deleteButton.disabled=false;}
      });
      actionsCell.appendChild(deleteButton);
    });
    $("metric-orders").textContent=state.orders.length;
  }
  function renderInventory() {
    const grid=$("inventory-cards"); grid.replaceChildren();
    if (!state.inventory.length) { grid.textContent="No inventory rows found. Check the database migration."; return; }
    state.inventory.forEach((item) => {
      const card=document.createElement("form"); card.className="stock-card";
      const title=document.createElement("h3"); title.textContent=item.pack_size_g===1000?"1 kg Honey":item.pack_size_g+" g Honey"; card.appendChild(title);
      const current=document.createElement("p"); current.className="stock-current"; current.textContent="Current stock: "+item.stock_qty+" units"; card.appendChild(current);
      const label=document.createElement("label"); label.textContent="Actual stock quantity";
      const input=document.createElement("input"); input.type="number"; input.name="stock_qty"; input.min="0"; input.max="1000000"; input.step="1"; input.required=true; input.value=String(item.stock_qty); label.appendChild(input); card.appendChild(label);
      const hidden=document.createElement("input"); hidden.type="hidden"; hidden.name="pack_size_g"; hidden.value=String(item.pack_size_g); card.appendChild(hidden);
      const button=document.createElement("button"); button.type="submit"; button.className="primary-button"; button.textContent="Update stock"; card.appendChild(button);
      card.addEventListener("submit", async (event) => {
        event.preventDefault(); button.disabled=true;
        try {
          const result=await api("inventory",{method:"PATCH",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({pack_size_g:item.pack_size_g,stock_qty:Number(input.value)})});
          item.stock_qty=result.item.stock_qty; current.textContent="Current stock: "+item.stock_qty+" units"; input.value=String(item.stock_qty);
          $("metric-stock").textContent=state.inventory.reduce((sum,x)=>sum+x.stock_qty,0);
          message("Stock updated for "+(item.pack_size_g===1000?"1 kg":item.pack_size_g+" g")+" honey.","success");
        } catch(error) { message(error.message,"error"); }
        finally { button.disabled=false; }
      });
      grid.appendChild(card);
    });
    $("metric-stock").textContent=state.inventory.reduce((sum,x)=>sum+x.stock_qty,0);
  }
  async function loadLeads() {
    const result=await api("leads"); state.leads=result.items||[]; renderLeads();
  }
  async function loadOrders() {
    const result=await api("orders"); state.orders=result.items||[]; renderOrders();
  }
  async function loadInventory() {
    const result=await api("inventory"); state.inventory=result.items||[]; renderInventory();
  }
  async function refreshAll() {
    message("Loading workspace data…");
    try {
      const health=await api("health");
      if (!health.ok || health.database!=="connected") throw new Error("Database connection needs attention.");
      await Promise.all([loadLeads(),loadOrders(),loadInventory()]);
      message("Workspace ready. Database connected; you can manage enquiries, orders and stock.","success");
    } catch(error) { message(error.message,"error"); }
  }

  document.querySelectorAll(".module-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".module-tab").forEach((tab)=>tab.classList.toggle("active",tab===button));
      document.querySelectorAll(".module-panel").forEach((panel)=>panel.hidden=panel.id!==button.dataset.panel);
    });
  });
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled=true;
      try {
        if(button.dataset.refresh==="leads") { await loadLeads(); message("Enquiries refreshed.","success"); }
        if(button.dataset.refresh==="orders") { await loadOrders(); message("Orders refreshed.","success"); }
      } catch(error) { message(error.message,"error"); }
      finally { button.disabled=false; }
    });
  });
  $("lead-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form=event.currentTarget; const button=form.querySelector('button[type="submit"]'); button.disabled=true;
    const data=Object.fromEntries(new FormData(form).entries());
    try {
      await api("leads",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(data)});
      form.reset(); await loadLeads(); message("Enquiry saved successfully.","success");
    } catch(error) { message(error.message,"error"); }
    finally { button.disabled=false; }
  });
  const sizeSelect=$("order-form").elements.pack_size_g;
  const priceInput=$("order-form").elements.unit_price_rupees;
  const prices={"250":"139","500":"279","1000":"549"};
  sizeSelect.addEventListener("change",()=>{priceInput.value=prices[sizeSelect.value]||"0";});
  $("order-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form=event.currentTarget; const button=form.querySelector('button[type="submit"]'); button.disabled=true;
    const data=Object.fromEntries(new FormData(form).entries());
    data.lead_id=Number(data.lead_id); data.pack_size_g=Number(data.pack_size_g); data.quantity=Number(data.quantity); data.unit_price_rupees=Number(data.unit_price_rupees); data.shipping_rupees=Number(data.shipping_rupees);
    if(!window.confirm("Save this order and deduct "+data.quantity+" unit(s) from "+(data.pack_size_g===1000?"1 kg":data.pack_size_g+" g")+" stock?")) { button.disabled=false; return; }
    try {
      const result=await api("orders",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(data)});
      form.reset(); sizeSelect.value="250"; priceInput.value="139"; form.elements.shipping_rupees.value="50"; form.elements.quantity.value="1";
      await Promise.all([loadOrders(),loadInventory()]);
      message("Order #"+result.item.id+" saved. Stock was deducted.","success");
    } catch(error) { message(error.message,"error"); }
    finally { button.disabled=false; }
  });
  $("logout-button").addEventListener("click", async function () {
    const button=this; button.disabled=true;
    try {
      const response=await fetch("/api/admin/logout",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json","accept":"application/json"},body:"{}"});
      if(!response.ok) throw new Error("Sign out could not be completed. Refresh and try again.");
      window.location.replace("/admin");
    } catch(error) { message(error.message,"error"); button.disabled=false; }
  });
  refreshAll();
})();