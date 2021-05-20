CREATE EXTERNAL TABLE `ibd_records`.`ibd_table`(
  `documentcreateddate` string COMMENT 'from deserializer', 
  `appointmentdate` string COMMENT 'from deserializer', 
  `patientid` string COMMENT 'from deserializer', 
  `id` string COMMENT 'from deserializer', 
  `problemhistory` string COMMENT 'from deserializer', 
  `lifestylenotes` string COMMENT 'from deserializer', 
  `familyhistory` string COMMENT 'from deserializer', 
  `extraintestinalmanifestations` string COMMENT 'from deserializer', 
  `pastsurgicalhistory` string COMMENT 'from deserializer', 
  `medicationinstances` array<string> COMMENT 'from deserializer', 
  `medicalconditions` array<string> COMMENT 'from deserializer', 
  `detectedprocedures` array<string> COMMENT 'from deserializer', 
  `datedsentences` array<string> COMMENT 'from deserializer')
ROW FORMAT SERDE 
  'org.openx.data.jsonserde.JsonSerDe' 
WITH SERDEPROPERTIES ( 
  'paths'='appointmentDate,datedSentences,detectedProcedures,documentCreatedDate,extraIntestinalManifestations,familyHistory,id,lifestyleNotes,medicalConditions,medicationInstances,pastSurgicalHistory,patientId,problemHistory') 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.mapred.TextInputFormat' 
OUTPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://<app-bucket>/ibd-records/'
TBLPROPERTIES (
  'CrawlerSchemaDeserializerVersion'='1.0', 
  'CrawlerSchemaSerializerVersion'='1.0', 
  'UPDATED_BY_CRAWLER'='ibd-crawler', 
  'averageRecordSize'='1515', 
  'classification'='json', 
  'compressionType'='none', 
  'objectCount'='23', 
  'recordCount'='23', 
  'sizeKey'='34945', 
  'typeOfData'='file')