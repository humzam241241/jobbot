"use client";

import { useSearchParams } from "next/navigation";

export default function Page() {
	const params = useSearchParams();
	const resume = params.get("resume");
	const cover = params.get("cover");
	const ats = params.get("ats");
	const resumeDocx = params.get("resumeDocx");
	const coverDocx = params.get("coverDocx");
	const atsDocx = params.get("atsDocx");

	return (
		<div className="mx-auto max-w-3xl p-6 space-y-6">
			<h1 className="text-2xl font-semibold">Your Resume Kit</h1>
			<p className="text-sm text-gray-400">Download your generated files below.</p>

			<div className="space-y-3">
				{resume && (
					<a
						href={resume}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download Resume
					</a>
				)}
				{resumeDocx && (
					<a
						href={resumeDocx}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download Resume (DOCX)
					</a>
				)}
				{cover && (
					<a
						href={cover}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download Cover Letter
					</a>
				)}
				{coverDocx && (
					<a
						href={coverDocx}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download Cover Letter (DOCX)
					</a>
				)}
				{ats && (
					<a
						href={ats}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download ATS Report
					</a>
				)}
				{atsDocx && (
					<a
						href={atsDocx}
						className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
						download
					>
						📥 Download ATS Report (DOCX)
					</a>
				)}
			</div>
		</div>
	);
}
