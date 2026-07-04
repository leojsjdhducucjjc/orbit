"use client";

import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSetRecoilState } from "recoil";

export default function AuthProvider() {
  const setLogin = useSetRecoilState(loginState);
  const router = useRouter();

  useEffect(() => {
    const path = router.pathname;
    const publicPath =
      path === "/login" || path === "/welcome" || path === "/forgot-password";
    if (publicPath) {
      return;
    }

    const checkLogin = async () => {
      try {
        const req = await axios.get("/api/@me");
        setLogin({ ...req.data.user, workspaces: req.data.workspaces || [] });
      } catch (err: any) {
        const error = err.response?.data?.error;
        if (error === "Workspace not setup") {
          router.push("/welcome");
          return;
        }
        if (error === "Not logged in") {
          router.push("/login");
          return;
        }
        console.error("Login check error:", err.response?.data ?? err);
      } finally {
      }
    };

    checkLogin();
  }, [router, router.pathname, setLogin]);

  return null;
}
