import type { QuestionBankDTO } from "@/types";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuestionForm } from "./QuestionForm";

interface QuestionFormSheetProps {
  open: boolean;
  question?: QuestionBankDTO | null;
  ownerQuizId?: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (question: QuestionBankDTO) => void;
}

export function QuestionFormSheet({
  open,
  question,
  ownerQuizId,
  onOpenChange,
  onSaved,
}: QuestionFormSheetProps) {
  const isEdit = question != null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[96vw] gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>{isEdit ? "Edit question" : "New question"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this question without leaving the quiz builder."
              : "Create a question while keeping the quiz builder in view."}
          </SheetDescription>
        </SheetHeader>

        <ScrollHintContainer
          axis="vertical"
          className="min-h-0 flex-1"
          viewportClassName="px-5 py-4"
        >
          <QuestionForm
            question={question ?? undefined}
            ownerQuizId={isEdit ? undefined : ownerQuizId}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        </ScrollHintContainer>
      </SheetContent>
    </Sheet>
  );
}
