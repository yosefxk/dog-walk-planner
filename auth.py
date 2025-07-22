# auth.py
import streamlit as st

ALLOWED_EMAILS = [e.strip().lower() for e in st.secrets["app"]["allowed_emails"]]

def authenticate():
    """
    Checks if the user is authenticated using Streamlit's built-in authentication,
    and restricts access to allowed emails only.

    Returns:
        bool: True if the user is authenticated and email is allowed, False otherwise.
    """
    if st.user.is_logged_in:
        user_email = getattr(st.user, "email", None)
        if user_email and user_email.lower() in ALLOWED_EMAILS:
            return True
        else:
            st.set_page_config(page_title="Access Denied", layout="centered")
            st.title("🐶 Dog Walk Planner")
            st.header("Access Denied")
            st.error("Your email is not authorized to use this app.")
            st.button("Log out", on_click=st.logout)
            return False

    # If not authenticated, show login prompt
    st.set_page_config(page_title="Login", layout="centered")
    st.title("🐶 Dog Walk Planner")
    st.header("This app is private.")
    st.subheader("Please log in to continue.")
    st.button("Log in with Google", on_click=st.login)

    return False