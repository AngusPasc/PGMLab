###############################################################################
#
# Copyright (C) 2014, Tavendo GmbH and/or collaborators. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
# this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following disclaimer in the documentation
# and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#
###############################################################################


from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import subprocess

import os
import os.path
import shutil # for removing directory

import json
import string

import uuid

from itertools import * # for skipping lines in a file

cwd = os.getcwd()

hosted_data = cwd + "/../../data/reactome_template/"

import sys
class AppSession(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        def system_call(command):
            self.log.info("system_call")
            p = subprocess.Popen([command], stdout=subprocess.PIPE, shell=True)
            return p.stdout.read()

        def getFolders():
            self.log.info("getFolders")
            directories = os.listdir(hosted_data)
            return directories

        def getFolder(pathwayId):
            self.log.info("getFolder")
            f = open(hosted_data+"folder_to_reactome_id.txt");
            for line in f:
             kv = line.split("\t")
             if kv[0] == pathwayId:
                 return kv[1]
            return None

        # SUBSCRIBE to a topic and receive events
        #
        def getPathway(pathwayId):
            self.log.info("getPathway")
            folders = getFolders()
            folder = getFolder(pathwayId).strip()
            filePath = hosted_data + folder + "/" + folder + ".pi"
            json_data = system_call("perl "+ cwd +"/../../bin/convert_pi_to_json.pl " + filePath + " " + hosted_data +"db_id_to_name_mapping.txt")
            pathway = json.loads(json_data)
            return pathway

        yield self.register(getPathway, 'pgmlab.pathway.get')
        self.log.info("procedure getPathway(pathwayId) registered")

        # REGISTER a procedure for remote calling
        #
        def getPathwayList():
            self.log.info("getPathwayList")
            json_data = open(hosted_data +"pathways.json").read()
            pathwayList = json.loads(json_data)
            return pathwayList

        yield self.register(getPathwayList, 'pgmlab.pathways.list')
        self.log.info("procedure getPathwayList() registered")

        def createPairwiseInteractionFile(runPath, pathway):
            self.log.info("createPairwiseInteractionFile")
            filePath = runPath + "/pathway.pi";
            pi = open(filePath, "w")
            numberOfNodes = len(pathway)
            pi.write(str(numberOfNodes)+"\n\n")
            for interaction in pathway:
                pi.write(str(interaction["source"]) + "\t")
                pi.write(str(interaction["target"]) + "\t")
                pi.write(str(interaction["value"])  + "\t")
                pi.write(str(interaction["logic"])  + "\n")
            pi.close()
            return numberOfNodes

        def createObservationFile(runPath, observationSet):
            self.log.info("createObservationFile")
            filePath = runPath + "/inference.obs"
            obs = open(filePath, "w")

            observations = observationSet["observations"]
            numberObs = len(observations)
            obs.write(str(numberObs)+"\n")
            # print("numberObs", numberObs)
            for observation in observations:
                # print("observation", observation)
                numberNodes = len(observation)
                obs.write(str(numberNodes)+"\n")
                for node in observation:
                    # print("node", node)
                    obs.write(str(node["name"])+"\t"+str(node["state"])+"\n")
            obs.close()
            return numberObs

        def generateFactorgraph(runPath):
            self.log.info("generateFactorgraph")
            system_call(str(cwd)+"/../../bin/pgmlab --generate-factorgraph --pairwise-interaction-file=" + str(runPath) + "/pathway.pi --logical-factorgraph-file=" + str(runPath) + "/logical.fg --number-of-states 3")

        def inferenceCommand(runPath):
            self.log.info("inferenceCommand")
            system_call("pgmlab --inference --pairwise-interaction-file=" + str(runPath) + "/pathway.pi --inference-factorgraph-file=" + str(runPath) + "/logical.fg --inference-observed-data-file=" + str(runPath) + "/inference.obs --posterior-probability-file=" + str(runPath) + "/pathway.pp --number-of-states 3")

        def readPosteriorProbabilityFile(runPath):
            self.log.info("readPosteriorProbabilityFile")
            filepath = runPath + "/pathway.pp"
            ppfile = open(filepath, "r")
            posteriorprobabilities = list()
            pp = dict()
            for line in ppfile:
                if line.startswith("---"):
                    posteriorprobabilities.append(pp);
                    pp = dict()
                    continue
                line = line.strip().split("\t")
                nodename = line[0]
                nodestateprob = line[1]
                if nodename not in pp.keys():
                    pp[nodename] = list()
                pp[nodename].append(nodestateprob)
            return posteriorprobabilities

        def runInference(pathway, observationSet, options):
            self.log.info("runInference")
            runID = str(uuid.uuid4())
            cwd = os.getcwd()
            tmpPath = cwd + "/../../tmp/"
            runPath = tmpPath + runID
            os.mkdir(runPath)

            numberOfNodes = createPairwiseInteractionFile(runPath, pathway)
            generateFactorgraph(runPath)
            numberOfObs = createObservationFile(runPath, observationSet)
            inferenceCommand(runPath)
            posteriorProbabilitiesSet = readPosteriorProbabilityFile(runPath)
            # shutil.rmtree(runPath)
            return {"runID":runID, "posteriorProbabilitiesSet":posteriorProbabilitiesSet}

        yield self.register(runInference, 'pgmlab.inference.run')
        self.log.info("subscribed to topic 'pgmlab.inference.run'")
