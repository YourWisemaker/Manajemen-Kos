"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/locale/copy/id";
import { newInviteId, useOnboarding } from "@/lib/onboarding";

/**
 * Step 5: Undang Staff — Task 11.1 / 11.2
 * ---------------------------------------
 * Optional staff email invites (visual only): add/remove email rows. "Lewati"
 * and "Selesai" both complete the wizard. On completion the onboarding draft
 * is cleared and the user lands on the dashboard with `?trial=baru`, which
 * surfaces the "trial ends in 14 days" banner.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.6
 */

export default function UndangStaffPage() {
  const router = useRouter();
  const { state, update, reset } = useOnboarding();
  const c = copy.onboarding.tim;
  const emails = state.tim.emails;

  const handleAddEmail = () => {
    update("tim", { emails: [...emails, { id: newInviteId(), value: "" }] });
  };

  const handleRemoveEmail = (id: string) => {
    update("tim", { emails: emails.filter((invite) => invite.id !== id) });
  };

  const handleEmailChange = (id: string, value: string) => {
    update("tim", {
      emails: emails.map((invite) => (invite.id === id ? { ...invite, value } : invite)),
    });
  };

  const handleComplete = () => {
    // Clear the draft and land on the dashboard with the trial banner flag.
    reset();
    router.push("/dasbor?trial=baru");
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{c.judul}</h1>
        <p className="text-sm text-muted-foreground">{c.deskripsi}</p>
      </div>

      <div className="space-y-3">
        {emails.map((invite, index) => (
          <div key={invite.id} className="flex items-center gap-2">
            <Input
              type="email"
              placeholder={c.emailPlaceholder}
              value={invite.value}
              onChange={(e) => handleEmailChange(invite.id, e.target.value)}
              aria-label={`Email staff ${index + 1}`}
            />
            {emails.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveEmail(invite.id)}
                aria-label="Hapus email"
              >
                <X className="lucide size-4" />
              </Button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddEmail}
          iconLeft={Plus}
        >
          {c.tambahEmail}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/onboarding/pembayaran")}
        >
          {copy.aksi.kembali}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline-ink" onClick={handleComplete}>
            {c.lewati}
          </Button>
          <Button type="button" onClick={handleComplete}>
            {copy.aksi.selesai}
          </Button>
        </div>
      </div>
    </section>
  );
}
