import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { entriesApi } from "@/api/entries";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { DocumentViewer } from "@/pages/documents/entry/DocumentViewer";
import { EntryForm } from "@/pages/documents/entry/EntryForm";
import { EntryToolbar } from "@/pages/documents/entry/EntryToolbar";
import { useDocumentEntry } from "@/queries/useDocumentEntry";
import type { DocType } from "@/types/domain";

export function DocumentEntryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { isLocked } = useCurrentContext();
  const entryQuery = useDocumentEntry(id);
  const [docType, setDocType] = useState<DocType>("ELECTRICITY_BILL");

  const activeDocType = entryQuery.data?.docType ?? docType;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <EntryToolbar
        fileName={id ? `Document #${id}` : t("entry.title")}
        docType={activeDocType}
        onDocTypeChange={setDocType}
        disabled={isLocked}
      />

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <DocumentViewer fileName={id} />
        <EntryForm
          docType={activeDocType}
          initialData={entryQuery.data?.data}
          issues={entryQuery.data?.issues ?? []}
          disabled={isLocked}
          onSave={(data, ack) => {
            if (id) void entriesApi.save(id, data, ack);
          }}
        />
      </div>
    </div>
  );
}

export default DocumentEntryPage;
