# app.py
import os
import streamlit as st
from datetime import datetime, timedelta
import json
import random

from auth import authenticate
from first_run import show_setup_form
from streamlit_extras.stylable_container import stylable_container

# ------------------------------------------------------------------
# --- AUTHENTICATION GATE ---
# ------------------------------------------------------------------
REQUIRE_AUTH = True  # Set to False to disable Google authentication

if REQUIRE_AUTH:
    if not authenticate():
        st.stop()

# ------------------------------------------------------------------
# CONFIGURATION & STATE MANAGEMENT
# ------------------------------------------------------------------
STATE_FILE = "data/state.json"
WEEKDAY_NAMES = ["Sunday", "Monday"]

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=4)

state = load_state()

# ------------------------------------------------------------------
# FIRST-RUN SETUP CHECK (only for authenticated users)
# ------------------------------------------------------------------
if "config" not in state:
    success, updated_state = show_setup_form(state)
    if success:
        save_state(updated_state)
        st.success("Configuration saved! The app will now reload.")
        st.rerun()
    st.stop()

# ------------------------------------------------------------------
# APP INITIALIZATION (runs only after setup is complete)
# ------------------------------------------------------------------
USER_NAMES = state["config"]["users"]
FIRST_DAY_OF_WEEK = state["config"]["first_day_of_week"]
USERS = ["", USER_NAMES[0], USER_NAMES[1], "Both"]
WALK_SLOTS = ["Morning", "Afternoon", "Evening"]
COLORS = {
    USER_NAMES[0]: ("#33bcee", "#000000"),
    USER_NAMES[1]: ("#e0395a", "#ffffff"),
    "Both":        ("#252e62", "#ffffff"),
    "":            ("#fdfefd", "#000000"),
}

# Color mapping for stylable_container (updated)
BUTTON_COLORS = {
    1: "#0000FF",   # User 1 (blue)
    2: "#ff4b4b",   # User 2 (red, matches highlight)
    3: "#732BF5",   # Both (purple)
    0: "#fdfefd",   # Unassigned (default)
}

st.set_page_config(
    page_title="Dog Walk Planner",
    page_icon=random.choice([":dog2:", ":hotdog:"]),
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Sidebar user info and logout
st.sidebar.write(f"Signed in as: **{st.user.name}**")
st.sidebar.button("Log out", on_click=st.logout)

# Settings section
st.sidebar.markdown("---")
st.sidebar.subheader("Settings")

# Settings form
with st.sidebar.form("settings_form"):
    st.write("**Update Configuration**")
    current_users = state["config"]["users"]
    new_user1 = st.text_input("User 1 Name", value=current_users[0])
    new_user2 = st.text_input("User 2 Name", value=current_users[1])
    current_first_day = state["config"]["first_day_of_week"]
    new_first_day = st.selectbox(
        "First day of week",
        options=WEEKDAY_NAMES,
        index=WEEKDAY_NAMES.index(current_first_day) if current_first_day in WEEKDAY_NAMES else 0
    )
    settings_submitted = st.form_submit_button("Update Settings")
    if settings_submitted:
        if not new_user1.strip() or not new_user2.strip():
            st.error("User names cannot be empty.")
        else:
            state["config"]["users"] = [new_user1.strip(), new_user2.strip()]
            state["config"]["first_day_of_week"] = new_first_day
            save_state(state)
            st.success("Settings updated! The app will reload.")
            st.rerun()

# UTILITY FUNCTIONS
def week_bounds(ref_date):
    # Map weekday names to Python's weekday() numbers (Monday=0, Sunday=6)
    weekday_map = {name: i for i, name in enumerate(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])}
    first_day_index_py = weekday_map[FIRST_DAY_OF_WEEK]
    days_to_subtract = (ref_date.weekday() - first_day_index_py + 7) % 7
    start_of_week = ref_date - timedelta(days=days_to_subtract)
    end_of_week = start_of_week + timedelta(days=6)
    return start_of_week, end_of_week

if "ref_date" not in st.session_state:
    st.session_state.ref_date = datetime.today()

def shift_week(delta):
    st.session_state.ref_date += timedelta(weeks=delta)

# CSS
st.markdown("""
<style>
    [data-testid="stHorizontalBlock"] { align-items: center; }
    .week-header { font-size: 1.3em; padding: 10px; margin-bottom: 20px; }
    .current-week { border: 2px solid #ff4b4b; border-radius: 8px; }
    .time-slot { text-align: right; height: 52px; display: flex; align-items: center; justify-content: flex-end; margin: 2px 0; padding-right: 25px; font-weight: 500; }
    .day-header { text-align: center; line-height: 1.4; }
    .date-text { font-size: 0.9em; color: #666; }
    div.stButton > button { width: 100%; border: 1px solid #ddd; }
</style>
""", unsafe_allow_html=True)

# MAIN APP LAYOUT
left, mid, right = st.columns([0.5, 4, 0.5])
start_of_week, end_of_week = week_bounds(st.session_state.ref_date)
with left:
    st.button("◀", on_click=shift_week, args=(-1,))
with mid:
    today = datetime.today().date()
    is_current = start_of_week.date() <= today <= end_of_week.date()
    css_class = "week-header" + (" current-week" if is_current else "")
    st.markdown(
        f"<h4 class='{css_class}' style='text-align:center'>"
        f"Week of {start_of_week.strftime('%B %d')} – {end_of_week.strftime('%B %d, %Y')}"
        "</h4>",
        unsafe_allow_html=True,
    )
with right:
    st.button("▶", on_click=shift_week, args=(1,))

# Build the list of dates for the current week, starting from the configured first day
week_dates = [start_of_week + timedelta(days=i) for i in range(7)]

# Ensure each date in the week has a grid in state
for date in week_dates:
    date_key = date.strftime("%Y-%m-%d")
    if date_key not in state:
        state[date_key] = [[0] * len(WALK_SLOTS) for _ in range(1)] * 1  # placeholder, will fix below

# Prepare the grid: a list of 7 lists (one per day), each with 3 slots
grid = []
for date in week_dates:
    date_key = date.strftime("%Y-%m-%d")
    # If the date's data is not a list of 3 ints, fix it
    if not (isinstance(state[date_key], list) and len(state[date_key]) == 1 and isinstance(state[date_key][0], list) and len(state[date_key][0]) == 3):
        # If old format (7 days per week), convert to new format
        if isinstance(state[date_key], list) and len(state[date_key]) == 3:
            state[date_key] = [state[date_key]]
        else:
            state[date_key] = [[0] * len(WALK_SLOTS)]
    grid.append(state[date_key][0])

slot_col, *day_cols = st.columns([0.8] + [1] * 7)

with slot_col:
    st.markdown("<div style='height:92px'></div>", unsafe_allow_html=True)
    for slot_name in WALK_SLOTS:
        # Add vertical spacing between rows
        st.markdown(f"<div class='time-slot' style='margin-bottom:18px'>{slot_name}</div>", unsafe_allow_html=True)

# Days
for day_i, col in enumerate(day_cols):
    day_date = week_dates[day_i]
    date_key = day_date.strftime("%Y-%m-%d")
    is_today = (day_date.date() == datetime.today().date())

    with col:
        header_style = "padding:8px;margin-bottom:10px;"
        if is_today:
            header_style += "border:2px solid #ff4b4b;border-radius:4px;"
        st.markdown(
            f"<div class='day-header' style='{header_style}'>"
            f"<b>{day_date.strftime('%A')}</b><br>"
            f"<span class='date-text'>{day_date.strftime('%d/%m')}</span></div>",
            unsafe_allow_html=True,
        )
        for slot_i in range(len(WALK_SLOTS)):
            user_idx = state[date_key][0][slot_i]
            label = USERS[user_idx] if user_idx else "—"
            key = f"{date_key}-{slot_i}"
            color = BUTTON_COLORS.get(user_idx, "#fdfefd")
            with stylable_container(
                f"{key}-container",
                css_styles=f"""
                    button {{
                        background-color: {color} !important;
                        color: {'#fff' if user_idx in (1,2,3) else '#000'} !important;
                        border: 1px solid #ddd;
                        width: 100%;
                        margin-bottom: 18px;
                        height: 48px;
                        font-weight: 600;
                        font-size: 1.05em;
                    }}
                """,
            ):
                if st.button(label, key=key, use_container_width=True):
                    state[date_key][0][slot_i] = (state[date_key][0][slot_i] + 1) % len(USERS)
                    save_state(state)
                    st.rerun()

# Totals
st.markdown("---")
user1_total = sum(day.count(1) for day in grid)
user2_total = sum(day.count(2) for day in grid)
both_total  = sum(day.count(3) for day in grid)
st.write(f"**{USER_NAMES[0]}:** {user1_total} walks  **{USER_NAMES[1]}:** {user2_total} walks **Both:** {both_total} walks")