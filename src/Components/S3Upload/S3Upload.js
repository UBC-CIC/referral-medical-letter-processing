import React, { Component } from "react";
import { connect } from "react-redux";
import {Storage } from "aws-amplify";
import {Tooltip} from "@material-ui/core";
import {withStyles} from "@material-ui/core/styles";
import { v4 as uuid } from 'uuid';
import {Grid, Divider} from "semantic-ui-react";
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';
import "./S3Upload.css";
import Button from "@material-ui/core/Button";
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { addProcessingStatus, updateProcessingStatus } from "../../actions/appStateActions";
import {enqueueAppNotification} from "../../actions/notificationActions";




const TextOnlyTooltip = withStyles({
    tooltip: {
        color: "black",
        backgroundColor: "lightgray",
        opacity: 0.5,
        fontSize: "1em"
    }
})(Tooltip);



class S3Upload extends Component {
    constructor(props) {
        super(props);

        this.state = {
            fileInput: {},
            displayFileOptions: false,
            invalidFileType: false,
            fileName: "",
            selectedFiles: [],
            isUploading: false,
            loadingProgress: 0,
            loadingInterval: null,
            displaySpecificPages: false,
            pageOption: "all",
            pageFilter: "none",
            patientID: "",
            status: "Ready",
            errorMessage: null,
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(e) {
        let patientID = e.target.value;
        this.setState({patientID: patientID});
    }

    handlePageSelectorChange = (e) => {
        e.preventDefault();
        if (e.target.value === "specific") {
            this.setState({
                displaySpecificPages: true,
                pageOption: "specific",
            })
        } else {
            this.setState({
                displaySpecificPages: false,
                pageOption: "all",
                pageFilter: "none",
            })
        }
    }

    handlePageFilterChange = (e) => {
        e.preventDefault();
        this.setState({
            pageFilter: e.target.value,
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.isProcessingFinished !== prevProps.isProcessingFinished) {
            if (this.props.isProcessingFinished) {
                const {loadingInterval} = this.state;
                const {clearProcessingState} = this.props;
                clearInterval(loadingInterval);
                // set loadingProgess
                this.setState({
                    loadingProgress: 100,
                });
                this.setState({
                    isUploading: false,
                    loadingProgress: 0,
                })
                clearProcessingState();
            }
        }

        if (this.props.status !== prevProps.status) {
            if (this.props.status.status === "Error") {
                const {loadingInterval} = this.state;
                const {clearProcessingState, enqueueAppNotification, processingFinished} = this.props;
                clearInterval(loadingInterval);
                this.setState({
                    loadingProgress: 0,
                    isUploading: false,
                    status: "Error",
                });
                processingFinished();
                clearProcessingState();
                enqueueAppNotification({type: "error", message: "File processing error occurred: " + this.props.status.errorMessage});
            } else {
                this.setState({
                    status: this.props.status.status,
                })
            }
        }
    }

    // validate file type
    fileUploaded = (e) => {
        e.preventDefault();
        let numFiles = e.target.files.length;
        let selectedFiles = [];
        if (numFiles > 0) {
            for (let i = 0; i < numFiles; i++) {
                let file  = e.target.files[i];
                let fileName = file.name;
                let dotIndex = fileName.lastIndexOf(".")+1;
                let fileExt = fileName.substr(dotIndex, fileName.length).toLowerCase();
                if (fileExt === "pdf" || fileExt === "jpg" || fileExt === "jpeg" || fileExt === "png") {
                    selectedFiles.push(fileName);
                    this.setState({
                        displayFileOptions: true,
                        invalidFileType: false,
                        fileName: fileName,
                        displaySpecificPages: false,
                        pageOption: "all",
                        pageFilter: "none",
                        status: "Ready",
                    })
                } else {
                    file.value = "";
                    selectedFiles = [];
                    this.setState({
                        invalidFileType: true,
                        selectedFiles: [],
                    })
                }
            }
        }
        this.setState({
            selectedFiles: selectedFiles,
        })
    }

    async handleSubmit(e) {
        e.preventDefault();
        const {addProcessingStatus, updateProcessingStatus} = this.props;
        const {pageOption, patientID} = this.state;
        let pages = [];
        if (pageOption !== "all") {
            let pageInput = document.getElementById("pages").value.split(",");
            pages = this.formatPages(pageInput);
        }
        const visibility = 'protected';
        const selectedFiles = document.getElementById("fileUpload").files;
        if (!selectedFiles.length) {
            return alert("Please choose a file to upload first!");
        }
        this.setState({
            isUploading: true,
            status: "Uploading",
        })
        this.setUploadingTimeout();
        for (let file of selectedFiles) {
            const fileName = file.name;
            let info;
            const [, , , extension] = /([^.]+)(\.(\w+))?$/.exec(fileName);
            const mimeType = fileName.slice(fileName.indexOf('.')+1);
            const keyName = uuid().concat("_").concat(fileName.replace(/\.[^/.]+$/, "")).concat("-" + mimeType);
            const key = `${keyName}${extension && '.'}${extension}`;
            addProcessingStatus({id: key, patientID: patientID, status: "Uploading"});
            Storage.put(key, file, {
                level: visibility,
            }).then(
                (result) => {
                    info = {
                        key: result.key,
                        keyName: keyName,
                        patientID: patientID,
                        confidence: 50,
                        pages: pages,
                        file_type: mimeType
                    }
                    updateProcessingStatus({id: key, status: "Processing"});
                    Storage.put(`file_info/${keyName}.json`, JSON.stringify(info), { level: visibility, contentType: 'json' })
                },
                (err) => {
                    updateProcessingStatus({id: key, status: "Error", errorMessage: "File processing error occurred: " + err.message});
                    return alert('Error uploading file: ', err.message);
                }
            ).then(() => {
                this.setState({
                    displayFileOptions: false,
                });
            });
        }
        this.setState({
            isUploading: false,
            loadingProgress: 0,
            selectedFiles: [],
        })
    }

    formatPages = (pageInput) => {

        let pageArray = [];
        for (let value of pageInput) {
            let rangeIndex = value.lastIndexOf("-");
            if (rangeIndex !== -1) {
                let rangeStart = Number(value.substring(0, rangeIndex));
                let rangeEnd = Number(value.substring(rangeIndex+1, value.length));
                for (let i = rangeStart; i < rangeEnd+1; i++) {
                    if (this.passesFilter(i)) {
                        pageArray.push(i.toString());
                    }
                }
            } else {
                let num = Number(value);
                if (this.passesFilter(num)) {
                    pageArray.push(num.toString());
                }
            }
        }

        return pageArray;
    }

    passesFilter = (number) => {
        const {pageFilter} = this.state;
        if (number <= 0) {
            return false;
        } else if (pageFilter === "odd" && (number % 2 !== 0)) {
            return true;
        } else if (pageFilter === "even" && (number % 2 === 0)) {
            return true;
        } else return pageFilter === "none";
    }

    setUploadingTimeout = () => {
        let loadingInterval = window.setInterval(setProgressBar, 500);
        this.setState({
            loadingInterval: loadingInterval,
        })
        const that = this;
        function setProgressBar() {
            const {loadingProgress} = that.state;
            if (loadingProgress < 93) {
                that.setState({
                    loadingProgress: loadingProgress+1,
                });
            } else {
                clearInterval(loadingInterval);
            }
        }
    }

    render() {
        const {displayFileOptions, invalidFileType, isUploading, loadingProgress,
            selectedFiles, displaySpecificPages, pageOption, pageFilter, patientID, status} = this.state;
        let selectedFilesName = "";
        for (let name of selectedFiles) {
            selectedFilesName += name + ", ";
        }
        return (
            <Grid style={{marginLeft: "1.66%"}}>
                <Grid.Row>
                    <Grid.Column>
                        <div className={"upload-box"}>
                            <Grid>
                                <Grid.Row style={{padding: "0px"}}>
                                    <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                        <div className={"upload-wrapper-top"}>
                                            <span className={"upload-wrapper-top-header"}>Upload File For Processing</span>
                                        </div>
                                    </Grid.Column>
                                </Grid.Row>
                                <Grid.Row style={{padding: "0px"}}>
                                    <Grid.Column verticalAlign={"top"} textAlign={"left"}>
                                        <div className={"upload-wrapper-top-bottom"}>
                                            <span className={"upload-wrapper-top-desc"}>Please select a file for upload and fill in the requested fields.</span>
                                            <br/>
                                            <span className={"upload-wrapper-top-desc"}><strong className={"important-text"}>Only the following file formats are accepted: pdf, png, or jpg format.</strong></span>
                                        </div>
                                    </Grid.Column>
                                </Grid.Row>
                                <Grid.Row className={"upload-input-info"}>
                                    <Grid.Column className={"upload-input-info-box"} textAlign={"left"} verticalAlign={"middle"}>
                                        <div className={"upload-input-info-box-inner"}>
                                            {(isUploading)?
                                                <Grid>
                                                    <Grid.Row style={{paddingBottom: "0px"}}>
                                                        <Grid.Column textAlign={"center"} verticalAlign={"middle"}>
                                                            <span className={"loading-message"}>
                                                                <strong>Please wait while your file is uploaded <span className={"loadingDots"}>...</span></strong>
                                                            </span>
                                                        </Grid.Column>
                                                    </Grid.Row>
                                                    <Grid.Row style={{paddingTop: "5px", paddingBottom: "0px"}}>
                                                        <Grid.Column>
                                                            <Box display="flex" alignItems="center">
                                                                <Box width="100%" mr={1}>
                                                                    <LinearProgress variant="determinate" value={loadingProgress} className={"progressBar"} />
                                                                </Box>
                                                                <Box minWidth={35}>
                                                                    <Typography variant="body2" color="textSecondary"
                                                                                className={"loading-num"}>{`${Math.round(
                                                                        loadingProgress,
                                                                    )}%`}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </Grid.Column>
                                                    </Grid.Row>
                                                    <Grid.Row style={{paddingTop: "0px"}}>
                                                        <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                            <span className={"loading-message"} style={{color: "orange"}}>
                                                                Current Stage: {status}
                                                            </span>
                                                        </Grid.Column>
                                                    </Grid.Row>
                                                </Grid>
                                                :
                                             <div>
                                                 <Grid>
                                                     <Grid.Row>
                                                         <Grid.Column textAlign={"center"} verticalAlign={"middle"}>
                                                             <input style={{ display: 'none' }} id="fileUpload" type="file" onChange={this.fileUploaded} multiple={true} />
                                                             <label htmlFor="fileUpload">
                                                                 <Button variant={"outlined"} style={{width: "100%", marginLeft: "-10px"}} component={"span"}
                                                                 ><strong>Upload</strong></Button>
                                                             </label>
                                                             {(invalidFileType)?
                                                                 <span className={"invalid-file-disclaimer"}>
                                                                <ReportProblemIcon size={"sm"}/>
                                                                The file type you have selected is not valid. Only pdf, png, or jpg types are valid.
                                                            </span>
                                                                 :
                                                                 null}
                                                             {((selectedFiles.length > 0) && !invalidFileType)?
                                                                 <div><span className={"file-selected-desc"}><strong>Files Selected: </strong>{selectedFilesName}</span></div>
                                                                 : null}
                                                         </Grid.Column>
                                                     </Grid.Row>
                                                 </Grid>
                                                 {(displayFileOptions)?
                                                     <div>
                                                         <Divider />
                                                         <Grid>
                                                             <Grid.Row style={{paddingBottom: "0px"}}>
                                                                 <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                     <span className={"file-options-header"}><strong>File Options</strong></span>
                                                                 </Grid.Column>
                                                             </Grid.Row>
                                                             <Grid.Row style={{padding: "0px"}}>
                                                                 <Grid.Column textAlign={"left"} verticalAlign={"top"}>
                                                                     <span className={"file-options-subheader"}>(* indicates a required field)</span>
                                                                 </Grid.Column>
                                                             </Grid.Row>
                                                         </Grid>
                                                         <br/>
                                                         <br/>
                                                         <Grid>
                                                             <Grid.Row>
                                                                 <Grid.Column textAlign={"left"} verticalAlign={"middle"} stretched={true}>
                                                                     <div className={"input-card"}>
                                                                         <Grid>
                                                                             <Grid.Row style={{paddingBottom: "0px"}}>
                                                                                 <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                     <label className={"label"} htmlFor="pageOption"><strong>Page Options:</strong></label>
                                                                                 </Grid.Column>
                                                                             </Grid.Row>
                                                                             <Grid.Row style={{paddingTop: "0px", paddingBottom: "0px"}}>
                                                                                 <Grid.Column>
                                                                                     <FormControl component={"fieldset"}>
                                                                                         <RadioGroup row aria-label="page-options" name="pageOption" value={pageOption} onChange={this.handlePageSelectorChange}>
                                                                                             <FormControlLabel value="all" control={<Radio style={{color: "#012144"}}/>} label="All" style={{paddingTop: "0px", paddingBottom: "0px"}}/>
                                                                                             <FormControlLabel value="specific" control={<Radio style={{color: "#012144"}} />} label="Specific Pages" style={{paddingTop: "0px", paddingBottom: "0px"}} />
                                                                                         </RadioGroup>
                                                                                     </FormControl>
                                                                                 </Grid.Column>
                                                                             </Grid.Row>
                                                                         </Grid>
                                                                         {(displaySpecificPages)?
                                                                             <Grid>
                                                                                 <Grid.Row style={{paddingBottom: "0px"}}>
                                                                                     <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                         <label className={"label"} htmlFor="pages"><strong>*Specific Pages (separated with commas):</strong></label>
                                                                                     </Grid.Column>
                                                                                 </Grid.Row>
                                                                                 <Grid.Row style={{padding: "0px"}}>
                                                                                     <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                         <div className="ui input input-value-box">
                                                                                             <input id="pages" type="text" placeholder={"eg. 1-6,9,11"} required={true}/>
                                                                                         </div>
                                                                                     </Grid.Column>
                                                                                 </Grid.Row>
                                                                                 <Grid.Row>
                                                                                     <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                         <span>
                                                                                             <label className={"label"} htmlFor="pageFilter"><strong>Page Filter: </strong></label>
                                                                                             <FormControl component={"fieldset"} style={{padding: "0px", marginTop: "-10px"}}>
                                                                                                 <RadioGroup row aria-label="page-filter" name="pageFilter" value={pageFilter} onChange={this.handlePageFilterChange}>
                                                                                                     <FormControlLabel value="none" control={<Radio style={{color: "orange"}}/>} label="None" style={{padding: "0px"}}/>
                                                                                                     <FormControlLabel value="even" control={<Radio style={{color: "orange"}} />} label="Even Only" style={{padding: "0px"}}/>
                                                                                                     <FormControlLabel value="odd" control={<Radio style={{color: "orange"}} />} label="Odd Only" style={{padding: "0px"}}/>
                                                                                                </RadioGroup>
                                                                                            </FormControl>
                                                                                         </span>
                                                                                     </Grid.Column>
                                                                                 </Grid.Row>
                                                                             </Grid>
                                                                             :
                                                                             null
                                                                         }
                                                                         <br/>
                                                                         <br/>
                                                                         <Grid>
                                                                             <Grid.Row style={{paddingBottom: "0px"}}>
                                                                                 <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                    <span>
                                                                                        <label className={"label"} htmlFor="patientID"><strong>*Patient ID:</strong></label>
                                                                                    </span>
                                                                                 </Grid.Column>
                                                                             </Grid.Row>
                                                                             <Grid.Row style={{padding: "0px"}}>
                                                                                 <Grid.Column textAlign={"left"} verticalAlign={"middle"}>
                                                                                     <div className={"ui input input-value-box"}>
                                                                                         <input type="text" id="patientID"
                                                                                                value={patientID}
                                                                                                onChange={this.handleChange}
                                                                                                required={true}
                                                                                         />
                                                                                     </div>
                                                                                 </Grid.Column>
                                                                             </Grid.Row>
                                                                         </Grid>
                                                                     </div>
                                                                 </Grid.Column>
                                                             </Grid.Row>
                                                         </Grid>

                                                         <Grid>
                                                             <Grid.Row>
                                                                 <Grid.Column textAlign={"center"} verticalAlign={"middle"} style={{paddingTop: "0px"}}>
                                                                     <button type="submit" id="submit-btn" className="ui secondary button"
                                                                             onClick={this.handleSubmit}>
                                                                         <Grid>
                                                                             <Grid.Row columns={2} style={{marginLeft: "-7px"}}>
                                                                                 <Grid.Column width={12} textAlign={"center"} verticalAlign={"middle"}>
                                                                                     Process File
                                                                                 </Grid.Column>
                                                                                 <Grid.Column width={4} style={{marginLeft: "-7px"}} textAlign={"center"} verticalAlign={"middle"}>
                                                                                     <CloudUploadIcon/>
                                                                                 </Grid.Column>
                                                                             </Grid.Row>
                                                                         </Grid>
                                                                     </button>
                                                                 </Grid.Column>
                                                             </Grid.Row>
                                                         </Grid>
                                                     </div>
                                                     : null}
                                             </div>
                                            }
                                            <Divider />
                                            <div>
                                                <span className={"post-processing-info"}>After the file is processed, the output data will appear in the table.</span>
                                            </div>
                                        </div>
                                    </Grid.Column>
                                </Grid.Row>
                            </Grid>
                        </div>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        isProcessingFinished: state.appState.processingFinished,
        status: state.appState.status,
    };
};

const mapDispatchToProps = {
    addProcessingStatus,
    updateProcessingStatus,
    enqueueAppNotification,
};


export default connect(mapStateToProps, mapDispatchToProps)(S3Upload);