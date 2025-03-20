import React from "react";

interface FileUploadAreaProps {
  onFilesDrop: (files: File[]) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  hideDropzone?: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesDrop,
  isDisabled = false,
  isLoading = false,
  hideDropzone = false,
}) => {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const filesArray = Array.from(event.dataTransfer.files);
      onFilesDrop(filesArray);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      onFilesDrop(filesArray);
      // Reset the input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  if (hideDropzone) {
    return null;
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={isDisabled}
      />
      <label
        htmlFor="file-upload"
        className={`flex flex-col items-center ${
          isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="text-sm text-muted-foreground mb-2">
          {isLoading ? "Uploading..." : "Drop files here or click to upload"}
        </span>
        <span className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, GIF, WebP
        </span>
      </label>
    </div>
  );
};

export default FileUploadArea; 