import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FileText, CheckCircle, XCircle, Eye, UserPlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function AdminSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed" | "approved" | "rejected" | undefined>(undefined);
  const [selectedSubmission, setSelectedSubmission] = useState<Id<"contactFormSubmissions"> | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { lng } = useParams();
  const lang = lng || "en";

  const submissions = useQuery(
    api.contactForm.listContactFormSubmissions,
    statusFilter ? { status: statusFilter } : {}
  );
  const updateStatus = useMutation(api.contactForm.updateContactFormStatus);

  const handleCreateClient = (submission: NonNullable<typeof submissions>[number]) => {
    const params = new URLSearchParams({
      prefill: "1",
      companyName: submission.companyName,
      contactName: submission.contactName,
      email: submission.email,
      phone: submission.phone,
    });
    navigate(`/${lang}/admin/clients?${params.toString()}`);
  };

  const handleUpdateStatus = async (
    submissionId: Id<"contactFormSubmissions">,
    status: "pending" | "reviewed" | "approved" | "rejected"
  ) => {
    try {
      await updateStatus({ submissionId, status });
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update status");
      }
    }
  };

  if (submissions === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const reviewedCount = submissions.filter((s) => s.status === "reviewed").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;

  const selectedSubmissionData = submissions.find((s) => s._id === selectedSubmission);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Form Submissions</h1>
          <p className="text-muted-foreground">
            Review and manage new account requests
          </p>
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            setStatusFilter(value === "all" ? undefined : (value as "pending" | "reviewed" | "approved" | "rejected"))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submissions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Review contact form submissions from new users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No submissions found
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                  <TableRow key={submission._id}>
                    <TableCell className="font-medium">{submission.companyName}</TableCell>
                    <TableCell>{submission.contactName}</TableCell>
                    <TableCell>{submission.email}</TableCell>
                    <TableCell>{submission.phone}</TableCell>
                    <TableCell>{submission.country}</TableCell>
                    <TableCell>
                      {submission.status === "pending" && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Pending
                        </Badge>
                      )}
                      {submission.status === "reviewed" && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Reviewed
                        </Badge>
                      )}
                      {submission.status === "approved" && (
                        <Badge variant="default" className="bg-green-600">
                          Approved
                        </Badge>
                      )}
                      {submission.status === "rejected" && (
                        <Badge variant="destructive">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(submission._id);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Create Client"
                          onClick={() => handleCreateClient(submission)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        {submission.status !== "approved" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateStatus(submission._id, "approved")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {submission.status !== "rejected" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUpdateStatus(submission._id, "rejected")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Full details of the contact form submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmissionData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-sm">{selectedSubmissionData.companyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                  <p className="text-sm">{selectedSubmissionData.contactName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedSubmissionData.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedSubmissionData.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-sm">{selectedSubmissionData.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="text-sm">{selectedSubmissionData.industry || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Monthly Volume</p>
                  <p className="text-sm">{selectedSubmissionData.expectedMonthlyVolume || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {selectedSubmissionData.status === "pending" && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Pending
                    </Badge>
                  )}
                  {selectedSubmissionData.status === "reviewed" && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Reviewed
                    </Badge>
                  )}
                  {selectedSubmissionData.status === "approved" && (
                    <Badge variant="default" className="bg-green-600">
                      Approved
                    </Badge>
                  )}
                  {selectedSubmissionData.status === "rejected" && (
                    <Badge variant="destructive">
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>

              {selectedSubmissionData.useCase && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Primary Use Case</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedSubmissionData.useCase}</p>
                </div>
              )}

              {selectedSubmissionData.additionalNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedSubmissionData.additionalNotes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between">
            {selectedSubmissionData && (
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  handleCreateClient(selectedSubmissionData);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Client
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
