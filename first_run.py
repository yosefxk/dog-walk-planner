# first_run.py
import streamlit as st

# Only allow Sunday or Monday
WEEKDAY_NAMES = ["Sunday", "Monday"]

def show_setup_form(state):
    """
    Displays the initial setup form for the application.
    When submitted, it updates the state dictionary with the configuration.

    Args:
        state (dict): The current application state.

    Returns:
        tuple[bool, dict]: A tuple containing a boolean indicating if the form was
                           successfully submitted, and the (potentially updated) state.
    """
    st.set_page_config(page_title="Planner Setup", layout="centered")
    st.title("🐶 Dog Walk Planner Setup")
    st.write("Welcome! Since this is the first time you're running the app, let's get a few things configured.")

    with st.form("setup_form"):
        st.header("1. Define Your Week")
        first_day = st.selectbox(
            "Select the first day of the week",
            options=WEEKDAY_NAMES,
            index=0  # Default to Sunday
        )

        st.header("2. Define Users")
        user1_name = st.text_input("Enter the name for User 1", "User1")
        user2_name = st.text_input("Enter the name for User 2", "User2")

        submitted = st.form_submit_button("Save Configuration and Start App")

        if submitted:
            if not user1_name or not user2_name:
                st.error("User names cannot be empty.")
                return False, state  # Indicate failure

            # Update the state dictionary with the new configuration
            state['config'] = {
                "first_day_of_week": first_day,
                "users": [user1_name, user2_name]
            }
            return True, state  # Indicate success
            
    # If form is not submitted yet, indicate it's still in progress
    return False, state