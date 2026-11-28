import { describe, it, expect } from "vitest";
import * as icons from "lucide-react";
import pkg from "../package.json";

describe("lucide-react 1.83 upgrade", () => {
  it("ships the 1.83 icon set while keeping the icons the app imports", () => {
    expect(pkg.dependencies["lucide-react"]).toMatch(/^\^1\.83\./);

    // Added (or renamed) in lucide-react 1.74.0.
    expect(icons.NigerianNaira).toBeDefined();
    expect(icons.BotCheck).toBeDefined();
    expect(icons.Cinema).toBeDefined();
    expect(icons.Doghouse).toBeDefined();

    // Added in lucide-react 1.83.0.
    expect(icons.MailSend).toBeDefined();

    // Every icon imported by app/ and components/ must still resolve.
    const usedIcons = [
      "ArrowDownToLine",
      "Ban",
      "Bell",
      "Calendar",
      "Check",
      "CheckCircle2",
      "ChevronDown",
      "ChevronRight",
      "Clock",
      "ExternalLink",
      "Eye",
      "EyeOff",
      "Inbox",
      "LogOut",
      "MessageCircle",
      "Minus",
      "Package",
      "PackageOpen",
      "Pencil",
      "Plus",
      "RefreshCw",
      "Rocket",
      "Search",
      "SearchX",
      "Send",
      "Settings",
      "Share2",
      "ShieldCheck",
      "ShoppingBag",
      "ShoppingCart",
      "Star",
      "Store",
      "Tag",
      "Trash2",
      "TrendingUp",
      "Truck",
      "UploadCloud",
      "X",
      "XCircle",
    ] as const;

    for (const name of usedIcons) {
      expect(icons[name], name).toBeDefined();
    }
  });
});
