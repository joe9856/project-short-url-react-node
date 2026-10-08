import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "../pages/Auth";
import { CreateForm } from "./CreateForm";
afterEach(() => vi.unstubAllGlobals());
describe("forms and API integration", () => {
  it("guides guests to authentication", () => {
    render(
      <MemoryRouter>
        <CreateForm authenticated={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "สร้างลิงก์" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
  it("registers using Fetch and updates user", async () => {
    const onLogin = vi.fn();
    const user = { id: "id", name: "ผู้ใช้", email: "test@example.com" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ user }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <Auth mode="register" onLogin={onLogin} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("ชื่อ"), {
      target: { value: "ผู้ใช้" },
    });
    fireEvent.change(screen.getByLabelText("อีเมล"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), {
      target: { value: "StrongPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/register");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("same-origin");
  });
  it("shows server field errors and permits retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              message: "กรุณาตรวจสอบข้อมูล",
              fields: { email: "อีเมลไม่ถูกต้อง" },
            },
          }),
        }),
    );
    render(
      <MemoryRouter>
        <Auth mode="login" onLogin={vi.fn()} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("อีเมล"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), {
      target: { value: "StrongPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "กรุณาตรวจสอบข้อมูล",
    );
    expect(screen.getByLabelText("อีเมล")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeEnabled();
  });
});
