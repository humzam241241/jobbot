"use client";

import React, { useState, useCallback, useRef } from "react";
import { formatFileSize } from "@/lib/utils/format";

interface FileUploadProps {
  name: string;
  accept?: string;
  maxSize?: number;
  label?: string;
  onChange?: (file: File | null) => void;
  className?: string;
}

export default function FileUpload({
  name,
  accept = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = "Upload File",
  onChange,
  className = "",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      setError(null);

      if (!selectedFile) {
        setFile(null);
        if (onChange) onChange(null);
        return;
      }

      // Validate file size
      if (selectedFile.size > maxSize) {
        setError(`File size exceeds the ${formatFileSize(maxSize)} limit`);
        setFile(null);
        if (onChange) onChange(null);
        return;
      }

      // Validate file type
      const fileType = selectedFile.type;
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      
      const acceptedTypes = accept.split(",").map(type => type.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith(".")) {
          return fileExtension === type.substring(1);
        }
        return fileType === type;
      });

      if (!isAccepted) {
        setError("Invalid file type. Please upload a PDF or DOCX file");
        setFile(null);
        if (onChange) onChange(null);
        return;
      }

      setFile(selectedFile);
      if (onChange) onChange(selectedFile);
    },
    [maxSize, accept, onChange]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileChange(e.dataTransfer.files[0]);
      }
    },
    [handleFileChange]
  );

  // Handle click to select file
  const handleClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      handleFileChange(selectedFile);
    },
    [handleFileChange]
  );

  // Handle remove file
  const handleRemoveFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onChange) onChange(null);
    },
    [onChange]
  );

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10"
            : error
            ? "border-red-500 bg-red-500/10"
            : file
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-gray-600 hover:border-emerald-500/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="text-center">
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-sm text-red-400 hover:text-red-300 underline"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="text-gray-400">
                <p className="font-medium">Drag & drop your file here</p>
                <p className="text-sm">or click to browse</p>
                <p className="text-xs mt-2">PDF or DOCX, up to {formatFileSize(maxSize)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
