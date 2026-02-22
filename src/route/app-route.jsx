import React from "react";
import { Route, Routes } from "react-router-dom";
import Catalog from "../pages/Catalog";
import Forum from "../pages/Forum";
import Random from "../pages/Random";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import UpdatePassword from "../pages/UpdatePassword";
import AuthConfirm from "../pages/AuthConfirm";
import AuthError from "../pages/AuthError";
import Logout from "../pages/Logout";
import Status from "../pages/Status";
import MyList from "../pages/MyList";
import Quiz from "../pages/Quiz";
import Protected from "../pages/Protected";
import RequireAuth from "../components/RequireAuth";

export default function AppRoute() {
    return (
        <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/random" element={<Random />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/sign-up" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/auth/error" element={<AuthError />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/status" element={<Status />} />
            <Route path="/my-list" element={<MyList />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/protected" element={<RequireAuth><Protected /></RequireAuth>} />
        </Routes>
    );
}