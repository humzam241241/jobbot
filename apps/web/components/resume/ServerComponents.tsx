'use server';

import React from 'react';
import MasterResume, { MasterResumeProps } from './MasterResume';
import CoverLetter, { CoverLetterProps } from './CoverLetter';
import ATSReport, { ATSReportProps } from './ATSReport';

export async function renderResume(props: MasterResumeProps): Promise<string> {
  return React.createElement(MasterResume, props) as unknown as string;
}

export async function renderCoverLetter(props: CoverLetterProps): Promise<string> {
  return React.createElement(CoverLetter, props) as unknown as string;
}

export async function renderATSReport(props: ATSReportProps): Promise<string> {
  return React.createElement(ATSReport, props) as unknown as string;
}
