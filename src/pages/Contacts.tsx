import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Search, Download, Plus, Phone, Mail, Building, FileText, Trash2, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Papa from 'papaparse';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhoneNumber, validateE164PhoneNumber, COUNTRY_CODES } from "@/lib/phoneUtils";

interface Contact {
  id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  call_status: string;
  call_result?: string;
  call_attempts: number;
  notes?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
}

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all-campaigns');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showAddContact, setShowAddContact] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('+44');

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchContacts();
    }
  }, [user, selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id);

      if (selectedCampaign && selectedCampaign !== 'all-campaigns') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      if (statusFilter !== 'all') {
        query = query.eq('call_status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setCsvPreview(results.data.slice(0, 10));
        
        // Capture all headers
        const headers = Object.keys(results.data[0] || {});
        setCsvHeaders(headers);
        
        // Auto-detect column mappings
        const mapping: {[key: string]: string} = {};
        
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('phone') || lowerHeader.includes('number') || lowerHeader.includes('mobile')) {
            mapping['phone_number'] = header;
          } else if (lowerHeader.includes('first') || lowerHeader.includes('fname') || lowerHeader === 'name') {
            mapping['first_name'] = header;
          } else if (lowerHeader.includes('last') || lowerHeader.includes('lname') || lowerHeader.includes('surname')) {
            mapping['last_name'] = header;
          } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
            mapping['email'] = header;
          } else if (lowerHeader.includes('company') || lowerHeader.includes('business') || lowerHeader.includes('organization')) {
            mapping['company'] = header;
          }
        });
        
        setColumnMapping(mapping);
        setShowColumnMapping(true);
        setUploading(false);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
        setUploading(false);
      }
    });
  };

  const importContacts = async () => {
    if (!selectedCampaign || selectedCampaign === 'all-campaigns' || csvData.length === 0) return;

    try {
      setUploading(true);
      
      // Normalize phone numbers and collect custom fields
      const contactsToInsert = csvData.map((row: any) => {
        const phoneNumber = row[columnMapping.phone_number] || '';
        const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber, selectedCountry) : '';
        
        // Collect custom fields (all unmapped columns)
        const customFields: any = {};
        csvHeaders.forEach(header => {
          if (!Object.values(columnMapping).includes(header) && row[header]) {
            customFields[header] = row[header];
          }
        });

        return {
          user_id: user?.id,
          campaign_id: selectedCampaign,
          phone_number: normalizedPhone,
          first_name: columnMapping.first_name && columnMapping.first_name !== 'none' ? row[columnMapping.first_name] : null,
          last_name: columnMapping.last_name && columnMapping.last_name !== 'none' ? row[columnMapping.last_name] : null,
          email: columnMapping.email && columnMapping.email !== 'none' ? row[columnMapping.email] : null,
          company: columnMapping.company && columnMapping.company !== 'none' ? row[columnMapping.company] : null,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
        };
      }).filter(contact => contact.phone_number && validateE164PhoneNumber(contact.phone_number));

      if (contactsToInsert.length === 0) {
        toast({
          title: "Error",
          description: "No valid phone numbers found. Please check your data and country selection.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { error } = await supabase
        .from('contacts')
        .insert(contactsToInsert);

      if (error) throw error;

      const invalidCount = csvData.length - contactsToInsert.length;
      const successMessage = `Imported ${contactsToInsert.length} contacts${invalidCount > 0 ? ` (${invalidCount} skipped due to invalid phone numbers)` : ''}`;

      toast({
        title: "Success",
        description: successMessage,
      });

      setShowColumnMapping(false);
      setCsvData([]);
      setCsvPreview([]);
      setCsvHeaders([]);
      fetchContacts();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: "Error",
        description: "Failed to import contacts",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteSelectedContacts = async () => {
    if (selectedContacts.size === 0) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedContacts.size} contacts`,
      });

      setSelectedContacts(new Set());
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive",
      });
    }
  };

  const exportContacts = () => {
    const csvContent = Papa.unparse(contacts);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchTerm === '' || 
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone_number.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'outline' as const },
      calling: { label: 'Calling', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'secondary' as const },
      failed: { label: 'Failed', variant: 'destructive' as const },
      do_not_call: { label: 'Do Not Call', variant: 'outline' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contact Management</h1>
          <p className="text-muted-foreground">Upload and manage your contact lists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportContacts} disabled={contacts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {selectedContacts.size > 0 && (
            <Button variant="destructive" onClick={deleteSelectedContacts}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedContacts.size})
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Contacts</TabsTrigger>
          <TabsTrigger value="manage">Manage Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Contact List</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file with your contacts. Support formats: .csv, .xlsx, .xls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign">Select Campaign *</Label>
                  <Select value={selectedCampaign === 'all-campaigns' ? undefined : selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className={!selectedCampaign || selectedCampaign === 'all-campaigns' ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Choose a campaign to upload contacts" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.length === 0 ? (
                        <SelectItem value="no-campaigns" disabled>
                          No campaigns available - Create one first
                        </SelectItem>
                      ) : (
                        campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {(!selectedCampaign || selectedCampaign === 'all-campaigns') && (
                    <p className="text-sm text-destructive mt-1">
                      Please select a campaign to upload contacts
                    </p>
                  )}
                  {campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to create a campaign first. Go to Campaigns → New Campaign.
                    </p>
                  )}
                </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Upload your contact file</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your CSV or Excel file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading || !selectedCampaign || selectedCampaign === 'all-campaigns' || campaigns.length === 0}
                  />
                  <label htmlFor="file-upload">
                    <Button 
                      variant="outline" 
                      disabled={uploading || !selectedCampaign || selectedCampaign === 'all-campaigns' || campaigns.length === 0} 
                      asChild
                    >
                      <span>
                        {uploading ? 'Processing...' : 
                         campaigns.length === 0 ? 'Create Campaign First' :
                         !selectedCampaign || selectedCampaign === 'all-campaigns' ? 'Select Campaign First' :
                         'Choose File'}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-campaigns">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="calling">Calling</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="do_not_call">Do Not Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contacts ({filteredContacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found. Upload a contact list to get started.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedContacts.size === filteredContacts.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
                              } else {
                                setSelectedContacts(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedContacts.has(contact.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedContacts);
                                if (checked) {
                                  newSelected.add(contact.id);
                                } else {
                                  newSelected.delete(contact.id);
                                }
                                setSelectedContacts(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {contact.first_name || contact.last_name 
                                  ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                                  : 'No Name'
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span className="text-sm">{contact.phone_number}</span>
                              </div>
                              {contact.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  <span className="text-sm">{contact.email}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.company && (
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3" />
                                <span className="text-sm">{contact.company}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(contact.call_status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {contact.call_attempts}
                            </span>
                          </TableCell>
                           <TableCell className="text-right">
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => {
                                 const newSelected = new Set([contact.id]);
                                 setSelectedContacts(newSelected);
                                 deleteSelectedContacts();
                               }}
                               className="text-destructive hover:text-destructive"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Column Mapping Dialog */}
      <Dialog open={showColumnMapping} onOpenChange={setShowColumnMapping}>
        <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Map CSV Columns</DialogTitle>
                        <DialogDescription>
                          Map your CSV columns to contact fields. Unmapped columns will be stored as custom fields.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Country for Phone Numbers</label>
                          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map(country => (
                                <SelectItem key={country.code} value={country.prefix}>
                                  {country.prefix} - {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Phone Number *</label>
                            <Select
                              value={columnMapping.phone_number || ''}
                              onValueChange={(value) => setColumnMapping(prev => ({...prev, phone_number: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">First Name</label>
                            <Select
                              value={columnMapping.first_name || 'none'}
                              onValueChange={(value) => setColumnMapping(prev => ({...prev, first_name: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Skip this field</SelectItem>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Last Name</label>
                            <Select
                              value={columnMapping.last_name || 'none'}
                              onValueChange={(value) => setColumnMapping(prev => ({...prev, last_name: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Skip this field</SelectItem>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Email</label>
                            <Select
                              value={columnMapping.email || 'none'}
                              onValueChange={(value) => setColumnMapping(prev => ({...prev, email: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Skip this field</SelectItem>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Company</label>
                            <Select
                              value={columnMapping.company || 'none'}
                              onValueChange={(value) => setColumnMapping(prev => ({...prev, company: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Skip this field</SelectItem>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>{header}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground">
                            Unmapped columns: {csvHeaders.filter(h => !Object.values(columnMapping).includes(h)).join(', ') || 'None'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            These will be stored as custom fields and can be used in your campaigns.
                          </p>
                        </div>
                      </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowColumnMapping(false)}>
              Cancel
            </Button>
            <Button 
              onClick={importContacts} 
              disabled={!columnMapping.phone_number || uploading}
            >
              {uploading ? 'Importing...' : `Import ${csvData.length} Contacts`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;