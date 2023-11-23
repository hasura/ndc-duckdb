import { MutationOperation, MutationOperationResults, MutationRequest, MutationResponse, NotSupported } from "@hasura/ndc-sdk-typescript";
import { Configuration } from "..";


export async function do_mutation(configuration: Configuration, mutation: MutationRequest): Promise<MutationResponse> {
    throw new NotSupported("Mutations are not supported", {});
}