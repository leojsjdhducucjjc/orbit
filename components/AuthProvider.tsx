"use client";

import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSetRecoilState } from "recoil";

export default function AuthProvider({
  setLoading,
}: {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const setLogin = useSetRecoilState(loginState);
  const Router = useRouter();

  useEffect(() => {
    const path = Router.pathname;
    const publicPath =
      path === "/login" || path === "/welcome" || path === "/forgot-password";
    if (publicPath) {
      setLoading(false);
      return;
    }

    const checkLogin = async () => {
      try {
        const req = await axios.get("/api/@me");
        setLogin({ ...req.data.user, workspaces: req.data.workspaces || [] });
      } catch (err: any) {
        const error = err.response?.data?.error;
        if (error === "Workspace not setup") {
          Router.push("/welcome");
          return;
        }
        if (error === "Not logged in") {
          Router.push("/login");
          return;
        }
        console.error("Login check error:", err.response?.data ?? err);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, [Router, Router.pathname, setLoading, setLogin]);

  return null;
}
