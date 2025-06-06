import { useState, useEffect } from "react"
import { IconX, IconPin } from "@tabler/icons"

export default function StickyNoteAnnouncement() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const announcementDismissed = localStorage.getItem("announcementDismissed")

    if (!announcementDismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("announcementDismissed", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="z-0 bg-gray-200 dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src="/favicon-32x32.png"
        alt="Orbit"
        className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
      />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
          <IconPin className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          Planetary
        </h3>

		<p className="text-sm text-gray-500 dark:text-gray-400 mt-0"> </p>
		<div className="text-gray-800 dark:text-gray-300 text-sm space-y-2">
			<p>
				👋 <strong>Welcome to Orbit V2.0.8!</strong> — Stability, Visual Improvements & Quality-of-Life Updates!
				<br />
				We’re excited to have you with us 🚀
			</p>

			<p className="mt-4 font-semibold">🛠️ API Update Stability</p>
			<p>
				We’ve resolved API failures and improved the reliability of key endpoints like staff activity and session data retrieval.
			</p>

			<p className="mt-4 font-semibold">🧱 Instance Creation Fixes</p>
			<p>
				Workspace/system creation bugs are now resolved — no more errors when launching new groups or teams.
			</p>

			<p className="mt-4 font-semibold">📄 Visible Changelogs & Versioning</p>
			<p>
				You’ll now see changelogs and version info inside the app, helping you track what’s new with every release.
			</p>

			<p className="mt-4 font-semibold">🎨 Visual & Dark Mode Improvements</p>
			<p>
				We've fixed low-contrast text, improved component styling, and made the dark theme more consistent across pages like Activity, Sessions, and Modals.
			</p>

			<p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
				Orbit is still in <em>beta</em> — we’re squashing bugs and improving things fast. Thanks for being part of the journey!
			</p>
		</div>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Close announcement"
      >
        <IconX className="w-5 h-5" />
      </button>
    </div>
  )
}
